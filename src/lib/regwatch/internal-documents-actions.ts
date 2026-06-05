"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const DOC_KINDS = [
  "sop",
  "policy",
  "permit",
  "work-instruction",
  "training-material",
  "validation-protocol",
  "risk-assessment",
  "other",
] as const;

const DOC_STATUSES = ["draft", "active", "superseded", "retired"] as const;

async function ensureDocContext(): Promise<
  | { ok: true; organizationId: string; userId: string; isAdmin: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const membership = await getMyMembership();
  if (!membership) return { ok: false, error: "No organization" };
  const gate = await checkFeatureGate("internal_documents");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Internal documents require the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  return {
    ok: true,
    organizationId: membership.organizationId,
    userId: user.id,
    isAdmin: membership.role === "owner" || membership.role === "admin",
  };
}

// ---------------------------------------------------------------------------
// Document metadata CRUD (file upload uses a separate flow — see uploadDocumentFile)
// ---------------------------------------------------------------------------

const createDocSchema = z.object({
  title: z.string().trim().min(1).max(200),
  docKind: z.enum(DOC_KINDS),
  internalCode: z.string().trim().max(80).nullable().optional(),
  version: z.string().trim().max(40).nullable().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  ownerRole: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  effectiveDate: z.string().date().nullable().optional(),
  nextReviewDate: z.string().date().nullable().optional(),
});

export async function createDocument(input: unknown): Promise<ActionResult> {
  const parsed = createDocSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureDocContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin)
    return { ok: false, error: "Only owners and admins can create documents" };

  const svc = createServiceClient();

  if (parsed.data.ownerUserId) {
    const { data: peer } = await svc
      .from("organization_members")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("user_id", parsed.data.ownerUserId)
      .maybeSingle();
    if (!peer) return { ok: false, error: "Owner isn't a member of your org" };
  }

  const { data, error } = await svc
    .from("internal_documents")
    .insert({
      organization_id: ctx.organizationId,
      title: parsed.data.title,
      doc_kind: parsed.data.docKind,
      internal_code: parsed.data.internalCode ?? null,
      version: parsed.data.version ?? null,
      owner_user_id: parsed.data.ownerUserId ?? ctx.userId,
      owner_role: parsed.data.ownerRole ?? null,
      description: parsed.data.description ?? null,
      effective_date: parsed.data.effectiveDate ?? null,
      next_review_date: parsed.data.nextReviewDate ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/documents");
  return { ok: true, id: data?.id as string };
}

const updateDocSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  docKind: z.enum(DOC_KINDS).optional(),
  internalCode: z.string().trim().max(80).nullable().optional(),
  version: z.string().trim().max(40).nullable().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  ownerRole: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  effectiveDate: z.string().date().nullable().optional(),
  nextReviewDate: z.string().date().nullable().optional(),
  status: z.enum(DOC_STATUSES).optional(),
});

export async function updateDocument(input: unknown): Promise<ActionResult> {
  const parsed = updateDocSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureDocContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin)
    return { ok: false, error: "Only owners and admins can edit documents" };

  const svc = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.docKind !== undefined) patch.doc_kind = parsed.data.docKind;
  if (parsed.data.internalCode !== undefined) patch.internal_code = parsed.data.internalCode;
  if (parsed.data.version !== undefined) patch.version = parsed.data.version;
  if (parsed.data.ownerUserId !== undefined) patch.owner_user_id = parsed.data.ownerUserId;
  if (parsed.data.ownerRole !== undefined) patch.owner_role = parsed.data.ownerRole;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.effectiveDate !== undefined) patch.effective_date = parsed.data.effectiveDate;
  if (parsed.data.nextReviewDate !== undefined) patch.next_review_date = parsed.data.nextReviewDate;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;

  const { error } = await svc
    .from("internal_documents")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/documents");
  revalidatePath(`/regwatch/documents/${parsed.data.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// File upload — server-side write to storage + DB metadata patch.
//
// Caller sends a FormData object with field "file" (the File) + metadata
// fields. We write at path <org>/<doc>/<uuid>-<filename>, then patch
// internal_documents with the file_path + size + mime.
// ---------------------------------------------------------------------------

export async function uploadDocumentFile(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await ensureDocContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin)
    return { ok: false, error: "Only owners and admins can upload files" };

  const docId = formData.get("documentId");
  const file = formData.get("file");
  if (typeof docId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Missing documentId or file" };
  }
  // 50MB cap (Team); Enterprise carve-out applied later.
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { ok: false, error: `File exceeds the 50MB limit (${file.size} bytes)` };
  }

  const svc = createServiceClient();
  // Confirm doc belongs to caller's org.
  const { data: doc } = await svc
    .from("internal_documents")
    .select("id, organization_id")
    .eq("id", docId)
    .maybeSingle();
  if (!doc || doc.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Document not found in your org" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 200);
  const path = `${ctx.organizationId}/${docId}/${crypto.randomUUID()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await svc.storage
    .from("regwatch-documents")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const { error: patchErr } = await svc
    .from("internal_documents")
    .update({
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .eq("id", docId);
  if (patchErr) return { ok: false, error: patchErr.message };

  revalidatePath("/regwatch/documents");
  revalidatePath(`/regwatch/documents/${docId}`);
  return { ok: true, id: docId };
}

// ---------------------------------------------------------------------------
// Linking — any org member can link a doc to a regulation
// ---------------------------------------------------------------------------

const linkSchema = z.object({
  internalDocumentId: z.string().uuid(),
  regulatoryItemId: z.string().uuid(),
  clauseAnchor: z.string().trim().max(120).nullable().optional(),
  linkRationale: z.string().trim().max(1000).nullable().optional(),
});

export async function linkDocumentToRegulation(
  input: unknown,
): Promise<ActionResult> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureDocContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  // Confirm doc belongs to caller's org.
  const { data: doc } = await svc
    .from("internal_documents")
    .select("id, organization_id")
    .eq("id", parsed.data.internalDocumentId)
    .maybeSingle();
  if (!doc || doc.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Document not found in your org" };
  }

  // Snapshot the regulation's last_changed_at as the version pin. Phase 3
  // cron supersedes when last_changed_at advances.
  const { data: reg } = await svc
    .from("regulatory_items")
    .select("id, last_changed_at")
    .eq("id", parsed.data.regulatoryItemId)
    .maybeSingle();
  if (!reg) return { ok: false, error: "Regulation not found" };

  const { data, error } = await svc
    .from("internal_document_regulation_links")
    .insert({
      organization_id: ctx.organizationId,
      internal_document_id: parsed.data.internalDocumentId,
      regulatory_item_id: parsed.data.regulatoryItemId,
      clause_anchor: parsed.data.clauseAnchor ?? null,
      link_rationale: parsed.data.linkRationale ?? null,
      linked_at_item_version:
        (reg.last_changed_at as string | null) ?? new Date().toISOString(),
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "This document is already linked to that regulation" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/regwatch/documents");
  revalidatePath(`/regwatch/documents/${parsed.data.internalDocumentId}`);
  return { ok: true, id: data?.id as string };
}

const unlinkSchema = z.object({ linkId: z.string().uuid() });

export async function unlinkDocumentFromRegulation(
  input: unknown,
): Promise<ActionResult> {
  const parsed = unlinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureDocContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { error } = await svc
    .from("internal_document_regulation_links")
    .delete()
    .eq("id", parsed.data.linkId)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/documents");
  return { ok: true };
}
