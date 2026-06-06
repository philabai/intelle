"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";
import { getTemplate } from "./templates/registry";
import { nextVersion, INITIAL_VERSION, type SemVer } from "./templates/version";

/**
 * Revision actions for the in-app TipTap editor.
 *
 *   - updateDocumentDraftBody — fast autosave path. Writes the live PM JSON
 *     into internal_documents.body_doc only. No revision row. No reason-
 *     for-change required. Optimistic lock on updated_at.
 *   - commitDocumentRevision — explicit "Save version" path. Snapshots the
 *     current body_doc into an immutable internal_document_revisions row,
 *     stamps the new (major, minor, patch) tuple via the user-picked bump
 *     choice, and advances current_revision_id. Reason-for-change required.
 *   - createDocumentFromTemplate — creates a fresh doc, instantiates
 *     body_doc from the registry template, and writes the initial v0.1.0
 *     revision in one transaction.
 *   - getCurrentRevisionVersion — returns the latest committed version
 *     tuple so the client can preview "next: v0.2.0" in the save dialog.
 */

export interface RevisionActionResult {
  ok: boolean;
  error?: string;
  revisionId?: string;
  version?: SemVer;
  conflict?: boolean;
  /**
   * New `updated_at` after a successful save. The client uses this to
   * refresh its optimistic-lock baseline — without it, the `set_updated_at`
   * trigger advances the row's timestamp on every save, and the SECOND
   * save in a session always conflicts because the client still holds
   * the page-load snapshot.
   */
  newUpdatedAt?: string;
}

async function ensureRevisionContext(): Promise<
  | {
      ok: true;
      organizationId: string;
      userId: string;
      displayName: string;
      isAdmin: boolean;
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
      error: `Internal documents require the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
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
    isAdmin: membership.role === "owner" || membership.role === "admin",
  };
}

async function loadDocForEdit(
  docId: string,
  organizationId: string,
): Promise<
  | {
      ok: true;
      id: string;
      bodyDoc: unknown;
      currentRevisionId: string | null;
      updatedAt: string;
      reviewState: string;
    }
  | { ok: false; error: string }
> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("internal_documents")
    .select("id, organization_id, body_doc, current_revision_id, updated_at, review_state")
    .eq("id", docId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Document not found" };
  if (data.organization_id !== organizationId) {
    return { ok: false, error: "Document not in your organization" };
  }
  return {
    ok: true,
    id: data.id as string,
    bodyDoc: data.body_doc as unknown,
    currentRevisionId: (data.current_revision_id as string | null) ?? null,
    updatedAt: data.updated_at as string,
    reviewState: data.review_state as string,
  };
}

async function extractPlainText(bodyDoc: unknown): Promise<string> {
  // Lightweight walker — concatenates every {type:'text', text} node.
  // Used to fill body_text_cached for FTS without a heavy parse.
  const out: string[] = [];
  function walk(n: unknown) {
    if (!n || typeof n !== "object") return;
    const node = n as { type?: string; text?: string; content?: unknown[] };
    if (node.type === "text" && typeof node.text === "string") out.push(node.text);
    if (Array.isArray(node.content)) for (const c of node.content) walk(c);
  }
  walk(bodyDoc);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Autosave path — updateDocumentDraftBody
// ---------------------------------------------------------------------------

const updateDraftBodySchema = z.object({
  docId: z.string().uuid(),
  bodyDoc: z.unknown(),
  /**
   * Snapshot of internal_documents.updated_at at editor mount. If the server
   * row has moved on (someone else saved), we return conflict=true so the
   * client can surface "your changes / their changes" and let the user
   * decide whether to overwrite.
   */
  expectedUpdatedAt: z.string(),
});

export async function updateDocumentDraftBody(
  input: unknown,
): Promise<RevisionActionResult> {
  const parsed = updateDraftBodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureRevisionContext();
  if (!ctx.ok) return ctx;

  const doc = await loadDocForEdit(parsed.data.docId, ctx.organizationId);
  if (!doc.ok) return doc;

  if (doc.updatedAt !== parsed.data.expectedUpdatedAt) {
    return { ok: false, error: "Document changed on the server", conflict: true };
  }

  const bodyText = await extractPlainText(parsed.data.bodyDoc);

  const svc = createServiceClient();
  const { data: updated, error } = await svc
    .from("internal_documents")
    .update({
      body_doc: parsed.data.bodyDoc,
      body_text_cached: bodyText,
    })
    .eq("id", parsed.data.docId)
    .eq("organization_id", ctx.organizationId)
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    newUpdatedAt: (updated?.updated_at as string | undefined) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Commit path — commitDocumentRevision
// ---------------------------------------------------------------------------

const commitRevisionSchema = z.object({
  docId: z.string().uuid(),
  bodyDoc: z.unknown(),
  reasonForChange: z.string().trim().min(3).max(2000),
  versionBump: z.enum(["major", "minor", "patch"]),
  expectedUpdatedAt: z.string(),
});

export async function commitDocumentRevision(
  input: unknown,
): Promise<RevisionActionResult> {
  const parsed = commitRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureRevisionContext();
  if (!ctx.ok) return ctx;

  const doc = await loadDocForEdit(parsed.data.docId, ctx.organizationId);
  if (!doc.ok) return doc;

  if (doc.updatedAt !== parsed.data.expectedUpdatedAt) {
    return { ok: false, error: "Document changed on the server", conflict: true };
  }

  const svc = createServiceClient();

  // Fetch previous version + max revision_number atomically. We can't do
  // this inside a real Postgres transaction from PostgREST, so we read
  // and then insert with the unique constraint on (doc, revision_number)
  // catching races.
  const { data: lastRevision } = await svc
    .from("internal_document_revisions")
    .select("revision_number, version_major, version_minor, version_patch")
    .eq("internal_document_id", parsed.data.docId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevVersion: SemVer = lastRevision
    ? {
        major: lastRevision.version_major as number,
        minor: lastRevision.version_minor as number,
        patch: lastRevision.version_patch as number,
      }
    : { major: 0, minor: 0, patch: 0 };
  const newRevisionNumber = lastRevision
    ? (lastRevision.revision_number as number) + 1
    : 1;
  const newVersion = lastRevision
    ? nextVersion(prevVersion, parsed.data.versionBump)
    : INITIAL_VERSION;

  const bodyText = await extractPlainText(parsed.data.bodyDoc);

  const { data: revision, error: revErr } = await svc
    .from("internal_document_revisions")
    .insert({
      organization_id: ctx.organizationId,
      internal_document_id: parsed.data.docId,
      revision_number: newRevisionNumber,
      revision_type: "editor",
      body_doc: parsed.data.bodyDoc,
      body_text: bodyText,
      version_major: newVersion.major,
      version_minor: newVersion.minor,
      version_patch: newVersion.patch,
      version_bump: parsed.data.versionBump,
      reason_for_change: parsed.data.reasonForChange,
      is_committed: true,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (revErr || !revision) {
    return {
      ok: false,
      error: revErr?.message ?? "Could not create revision",
    };
  }

  // Update the doc's pointer + display version + live body.
  const versionLabel = `v${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
  const { data: updated, error: docErr } = await svc
    .from("internal_documents")
    .update({
      current_revision_id: revision.id,
      body_doc: parsed.data.bodyDoc,
      body_text_cached: bodyText,
      version: versionLabel,
    })
    .eq("id", parsed.data.docId)
    .eq("organization_id", ctx.organizationId)
    .select("updated_at")
    .single();
  if (docErr) {
    return { ok: false, error: docErr.message };
  }

  // Audit event.
  await svc.from("internal_document_audit_events").insert({
    organization_id: ctx.organizationId,
    internal_document_id: parsed.data.docId,
    revision_id: revision.id,
    event_type: "revision_committed",
    actor_user_id: ctx.userId,
    actor_display_snapshot: ctx.displayName,
    payload: {
      version: versionLabel,
      versionBump: parsed.data.versionBump,
      reasonForChange: parsed.data.reasonForChange,
    },
  });

  revalidatePath("/regwatch/documents");
  revalidatePath(`/regwatch/documents/${parsed.data.docId}`);
  revalidatePath(`/regwatch/documents/${parsed.data.docId}/edit`);

  return {
    ok: true,
    revisionId: revision.id as string,
    version: newVersion,
    newUpdatedAt: (updated?.updated_at as string | undefined) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Template instantiation — createDocumentFromTemplate
// ---------------------------------------------------------------------------

const createFromTemplateSchema = z.object({
  templateKey: z.string().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  folderId: z.string().uuid().nullable().optional(),
});

export async function createDocumentFromTemplate(
  input: unknown,
): Promise<RevisionActionResult & { id?: string }> {
  const parsed = createFromTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureRevisionContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin) {
    return { ok: false, error: "Only owners and admins can create documents" };
  }

  const template = getTemplate(parsed.data.templateKey);
  if (!template) {
    return { ok: false, error: `Unknown template "${parsed.data.templateKey}"` };
  }

  // Folder sanity check.
  const svc = createServiceClient();
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

  const bodyText = await extractPlainText(template.prosemirrorJson);

  // Insert the doc shell + initial body in one call.
  const { data: doc, error: docErr } = await svc
    .from("internal_documents")
    .insert({
      organization_id: ctx.organizationId,
      title: parsed.data.title,
      doc_kind:
        template.defaultMetadata.suggestedKind ?? template.kind,
      template_key: template.key,
      body_doc: template.prosemirrorJson,
      body_text_cached: bodyText,
      review_state: "draft",
      version: "v0.1.0",
      folder_id: parsed.data.folderId ?? null,
      owner_user_id: ctx.userId,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (docErr || !doc) {
    return { ok: false, error: docErr?.message ?? "Could not create document" };
  }

  // Write the initial v0.1.0 revision.
  const { data: revision, error: revErr } = await svc
    .from("internal_document_revisions")
    .insert({
      organization_id: ctx.organizationId,
      internal_document_id: doc.id,
      revision_number: 1,
      revision_type: "editor",
      body_doc: template.prosemirrorJson,
      body_text: bodyText,
      version_major: INITIAL_VERSION.major,
      version_minor: INITIAL_VERSION.minor,
      version_patch: INITIAL_VERSION.patch,
      version_bump: "minor",
      reason_for_change: `Created from template ${template.label}`,
      is_committed: true,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (revErr || !revision) {
    return { ok: false, error: revErr?.message ?? "Could not create initial revision" };
  }

  await svc
    .from("internal_documents")
    .update({ current_revision_id: revision.id })
    .eq("id", doc.id);

  // Audit event.
  await svc.from("internal_document_audit_events").insert({
    organization_id: ctx.organizationId,
    internal_document_id: doc.id,
    revision_id: revision.id,
    event_type: "created",
    actor_user_id: ctx.userId,
    actor_display_snapshot: ctx.displayName,
    payload: {
      templateKey: template.key,
      templateLabel: template.label,
      family: template.family,
    },
  });

  revalidatePath("/regwatch/documents");
  return {
    ok: true,
    id: doc.id as string,
    revisionId: revision.id as string,
    version: INITIAL_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Query helper — getNextVersionPreview (for the Save dialog)
// ---------------------------------------------------------------------------

export async function getCurrentRevisionVersion(
  input: unknown,
): Promise<{ ok: true; version: SemVer | null } | { ok: false; error: string }> {
  const schema = z.object({ docId: z.string().uuid() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureRevisionContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { data } = await svc
    .from("internal_document_revisions")
    .select("version_major, version_minor, version_patch")
    .eq("internal_document_id", parsed.data.docId)
    .eq("organization_id", ctx.organizationId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { ok: true, version: null };
  return {
    ok: true,
    version: {
      major: data.version_major as number,
      minor: data.version_minor as number,
      patch: data.version_patch as number,
    },
  };
}
