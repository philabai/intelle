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

async function ensureFolderAdmin(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const membership = await getMyMembership();
  if (!membership) return { ok: false, error: "No organization" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return {
      ok: false,
      error: "Only owners and admins can manage document folders",
    };
  }
  const gate = await checkFeatureGate("internal_documents");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Internal documents require the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  return { ok: true, organizationId: membership.organizationId, userId: user.id };
}

async function ensureFolderMember(): Promise<
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
// Create folder
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export async function createFolder(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureFolderAdmin();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  // Sanity: parent (if any) must belong to caller's org.
  if (parsed.data.parentId) {
    const { data: parent } = await svc
      .from("internal_document_folders")
      .select("id, organization_id")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (!parent || parent.organization_id !== ctx.organizationId) {
      return { ok: false, error: "Parent folder not found in your org" };
    }
  }

  const { data, error } = await svc
    .from("internal_document_folders")
    .insert({
      organization_id: ctx.organizationId,
      parent_id: parsed.data.parentId ?? null,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A folder with that name already exists in the same parent",
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/regwatch/documents");
  return { ok: true, id: data?.id as string };
}

// ---------------------------------------------------------------------------
// Rename / update description
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export async function updateFolder(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureFolderAdmin();
  if (!ctx.ok) return ctx;

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    patch.description = parsed.data.description;
  if (Object.keys(patch).length === 0)
    return { ok: false, error: "Nothing to update" };

  const svc = createServiceClient();
  const { error } = await svc
    .from("internal_document_folders")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A folder with that name already exists in the same parent",
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/regwatch/documents");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Move folder (reparent)
// ---------------------------------------------------------------------------

const moveSchema = z.object({
  id: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
});

export async function moveFolder(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureFolderAdmin();
  if (!ctx.ok) return ctx;
  if (parsed.data.id === parsed.data.newParentId) {
    return { ok: false, error: "A folder cannot be its own parent" };
  }

  const svc = createServiceClient();
  // Prevent moving into a descendant (would create a cycle).
  if (parsed.data.newParentId) {
    const descendantIds = await collectDescendants(parsed.data.id);
    if (descendantIds.has(parsed.data.newParentId)) {
      return {
        ok: false,
        error: "Cannot move a folder into one of its own descendants",
      };
    }
  }

  const { error } = await svc
    .from("internal_document_folders")
    .update({ parent_id: parsed.data.newParentId })
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/documents");
  return { ok: true };
}

async function collectDescendants(rootId: string): Promise<Set<string>> {
  const svc = createServiceClient();
  const seen = new Set<string>();
  let frontier = [rootId];
  while (frontier.length > 0) {
    const { data } = await svc
      .from("internal_document_folders")
      .select("id")
      .in("parent_id", frontier);
    const next: string[] = [];
    for (const r of data ?? []) {
      const id = r.id as string;
      if (!seen.has(id)) {
        seen.add(id);
        next.push(id);
      }
    }
    frontier = next;
  }
  return seen;
}

// ---------------------------------------------------------------------------
// Archive folder (soft delete) — refuses to archive folders with content
// unless force=true. When forced, descendant folders are also archived and
// documents inside are detached (folder_id → NULL) so they become "Unfiled".
// ---------------------------------------------------------------------------

const archiveSchema = z.object({
  id: z.string().uuid(),
  force: z.boolean().default(false),
});

export async function archiveFolder(input: unknown): Promise<ActionResult> {
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureFolderAdmin();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const descendantIds = await collectDescendants(parsed.data.id);
  const allIds = [parsed.data.id, ...Array.from(descendantIds)];

  // Count documents inside the folder + descendants.
  const { count: docCount } = await svc
    .from("internal_documents")
    .select("id", { count: "exact", head: true })
    .in("folder_id", allIds);

  if ((docCount ?? 0) > 0 && !parsed.data.force) {
    return {
      ok: false,
      error: `Folder contains ${docCount} document${docCount === 1 ? "" : "s"}. Confirm by archiving with force enabled.`,
    };
  }

  // Detach docs (move to Unfiled) so we don't lose them.
  if ((docCount ?? 0) > 0) {
    await svc
      .from("internal_documents")
      .update({ folder_id: null })
      .in("folder_id", allIds);
  }

  // Soft-archive every node.
  const { error } = await svc
    .from("internal_document_folders")
    .update({ archived_at: new Date().toISOString() })
    .in("id", allIds)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/documents");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Move a document into / out of a folder. Any org member can do this.
// ---------------------------------------------------------------------------

const moveDocSchema = z.object({
  documentId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
});

export async function moveDocumentToFolder(
  input: unknown,
): Promise<ActionResult> {
  const parsed = moveDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureFolderMember();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  // Verify ownership of both.
  const { data: doc } = await svc
    .from("internal_documents")
    .select("id, organization_id")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc || doc.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Document not found in your org" };
  }
  if (parsed.data.folderId) {
    const { data: folder } = await svc
      .from("internal_document_folders")
      .select("id, organization_id")
      .eq("id", parsed.data.folderId)
      .maybeSingle();
    if (!folder || folder.organization_id !== ctx.organizationId) {
      return { ok: false, error: "Folder not found in your org" };
    }
  }

  const { error } = await svc
    .from("internal_documents")
    .update({ folder_id: parsed.data.folderId })
    .eq("id", parsed.data.documentId)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/documents");
  revalidatePath(`/regwatch/documents/${parsed.data.documentId}`);
  return { ok: true };
}
