"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";

/**
 * Write-side actions for the doc comments drawer.
 *
 * Comments use the user client for inserts so RLS proves who authored
 * the row (matches the signature pattern in the workflow actions).
 * Each insert + resolve also drops an immutable audit event so the
 * thread shows up on the exported audit trail alongside state changes.
 */

interface ActionResult {
  ok: boolean;
  error?: string;
  commentId?: string;
}

async function ensureContext(): Promise<
  | {
      ok: true;
      organizationId: string;
      userId: string;
      displayName: string;
    }
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
      error: `Internal documents require the ${gate.requiredTier} plan.`,
    };
  }
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    user.id;
  return {
    ok: true,
    organizationId: membership.organizationId,
    userId: user.id,
    displayName,
  };
}

async function assertDocInOrg(
  docId: string,
  organizationId: string,
): Promise<{ ok: true; currentRevisionId: string | null } | { ok: false; error: string }> {
  const svc = createServiceClient();
  const { data: doc } = await svc
    .from("internal_documents")
    .select("id, organization_id, current_revision_id")
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Document not found" };
  if (doc.organization_id !== organizationId) {
    return { ok: false, error: "Document not in your organization" };
  }
  return {
    ok: true,
    currentRevisionId: (doc.current_revision_id as string | null) ?? null,
  };
}

const addCommentSchema = z.object({
  docId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
  anchor: z
    .object({
      quote: z.string().trim().max(500).optional(),
      paragraphAnchor: z.string().trim().max(200).optional(),
    })
    .optional(),
});

export async function addComment(input: unknown): Promise<ActionResult> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureContext();
  if (!ctx.ok) return ctx;

  const docCheck = await assertDocInOrg(parsed.data.docId, ctx.organizationId);
  if (!docCheck.ok) return docCheck;

  const userClient = await createClient();
  const { data: ins, error } = await userClient
    .from("internal_document_comments")
    .insert({
      organization_id: ctx.organizationId,
      internal_document_id: parsed.data.docId,
      revision_id: docCheck.currentRevisionId,
      author_user_id: ctx.userId,
      body: parsed.data.body,
      anchor: parsed.data.anchor ?? null,
    })
    .select("id")
    .single();
  if (error || !ins) {
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  const svc = createServiceClient();
  await svc.from("internal_document_audit_events").insert({
    organization_id: ctx.organizationId,
    internal_document_id: parsed.data.docId,
    revision_id: docCheck.currentRevisionId,
    event_type: "comment_added",
    actor_user_id: ctx.userId,
    actor_display_snapshot: ctx.displayName,
    payload: {
      commentId: ins.id,
      anchor: parsed.data.anchor ?? null,
      preview: parsed.data.body.slice(0, 140),
    },
  });

  revalidatePath(`/regwatch/documents/${parsed.data.docId}`);
  return { ok: true, commentId: ins.id as string };
}

const replySchema = z.object({
  docId: z.string().uuid(),
  parentCommentId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
});

export async function replyToComment(input: unknown): Promise<ActionResult> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureContext();
  if (!ctx.ok) return ctx;

  const docCheck = await assertDocInOrg(parsed.data.docId, ctx.organizationId);
  if (!docCheck.ok) return docCheck;

  // Parent must be on the same doc.
  const svc = createServiceClient();
  const { data: parent } = await svc
    .from("internal_document_comments")
    .select("id, internal_document_id")
    .eq("id", parsed.data.parentCommentId)
    .maybeSingle();
  if (!parent || parent.internal_document_id !== parsed.data.docId) {
    return { ok: false, error: "Parent comment not found on this doc" };
  }

  const userClient = await createClient();
  const { data: ins, error } = await userClient
    .from("internal_document_comments")
    .insert({
      organization_id: ctx.organizationId,
      internal_document_id: parsed.data.docId,
      revision_id: docCheck.currentRevisionId,
      author_user_id: ctx.userId,
      body: parsed.data.body,
      parent_comment_id: parsed.data.parentCommentId,
    })
    .select("id")
    .single();
  if (error || !ins) {
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  revalidatePath(`/regwatch/documents/${parsed.data.docId}`);
  return { ok: true, commentId: ins.id as string };
}

const resolveSchema = z.object({
  docId: z.string().uuid(),
  commentId: z.string().uuid(),
  resolve: z.boolean(),
});

export async function setCommentResolved(input: unknown): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureContext();
  if (!ctx.ok) return ctx;

  const docCheck = await assertDocInOrg(parsed.data.docId, ctx.organizationId);
  if (!docCheck.ok) return docCheck;

  const userClient = await createClient();
  const { error } = await userClient
    .from("internal_document_comments")
    .update({
      resolved_at: parsed.data.resolve ? new Date().toISOString() : null,
      resolved_by: parsed.data.resolve ? ctx.userId : null,
    })
    .eq("id", parsed.data.commentId)
    .eq("internal_document_id", parsed.data.docId);
  if (error) return { ok: false, error: error.message };

  const svc = createServiceClient();
  await svc.from("internal_document_audit_events").insert({
    organization_id: ctx.organizationId,
    internal_document_id: parsed.data.docId,
    revision_id: docCheck.currentRevisionId,
    event_type: "comment_resolved",
    actor_user_id: ctx.userId,
    actor_display_snapshot: ctx.displayName,
    payload: { commentId: parsed.data.commentId, resolved: parsed.data.resolve },
  });

  revalidatePath(`/regwatch/documents/${parsed.data.docId}`);
  return { ok: true };
}
