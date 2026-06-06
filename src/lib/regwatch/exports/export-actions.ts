"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { getMyMembership } from "@/lib/regwatch/members";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { bodyDocToDocxBuffer } from "./pm-to-docx";
import { bodyDocToPdfBuffer } from "./pm-to-pdf";

/**
 * Export the live editor body to DOCX or PDF and persist the result as
 * the document's file (file_path / file_name / file_size / mime_type).
 *
 * The exported file becomes the canonical artifact attached to the
 * document — what the right-sidebar "File" panel shows, what assigned
 * reviewers/approvers see, and what the audit trail printout pulls.
 *
 * We DO NOT create a new internal_document_revisions row here — the
 * revision history tracks editor commits + uploads; exports are just
 * a derived artifact of the current editor state.
 */

interface ExportResult {
  ok: boolean;
  error?: string;
  filePath?: string;
  fileName?: string;
  signedUrl?: string;
}

const inputSchema = z.object({
  docId: z.string().uuid(),
  format: z.enum(["docx", "pdf"]),
});

export async function exportDocumentAsFile(
  input: unknown,
): Promise<ExportResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

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
  const isAdmin =
    membership.role === "owner" || membership.role === "admin";
  if (!isAdmin) {
    return { ok: false, error: "Only owners and admins can export documents" };
  }

  const svc = createServiceClient();
  const { data: doc, error: loadErr } = await svc
    .from("internal_documents")
    .select("id, organization_id, title, body_doc")
    .eq("id", parsed.data.docId)
    .maybeSingle();
  if (loadErr || !doc) {
    return { ok: false, error: loadErr?.message ?? "Document not found" };
  }
  if (doc.organization_id !== membership.organizationId) {
    return { ok: false, error: "Document not in your organization" };
  }
  if (!doc.body_doc) {
    return {
      ok: false,
      error: "This document has no editor body yet — nothing to export.",
    };
  }

  const meta = { title: (doc.title as string) ?? "Untitled" };
  let buffer: Buffer;
  let mimeType: string;
  let extension: string;
  try {
    if (parsed.data.format === "docx") {
      buffer = await bodyDocToDocxBuffer(doc.body_doc as unknown, meta);
      mimeType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      extension = "docx";
    } else {
      buffer = await bodyDocToPdfBuffer(doc.body_doc as unknown, meta);
      mimeType = "application/pdf";
      extension = "pdf";
    }
  } catch (e) {
    return {
      ok: false,
      error: `Export failed: ${(e as Error).message}`,
    };
  }

  const safeTitle =
    meta.title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "Document";
  const filename = `${safeTitle}-${Date.now()}.${extension}`;
  const path = `${membership.organizationId}/${doc.id}/${crypto.randomUUID()}-${filename}`;

  const { error: upErr } = await svc.storage
    .from("regwatch-documents")
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });
  if (upErr) {
    return { ok: false, error: `Storage upload failed: ${upErr.message}` };
  }

  // Patch the doc record so the new file becomes the canonical artifact.
  const { error: patchErr } = await svc
    .from("internal_documents")
    .update({
      file_path: path,
      file_name: filename,
      file_size: buffer.length,
      mime_type: mimeType,
    })
    .eq("id", doc.id)
    .eq("organization_id", membership.organizationId);
  if (patchErr) {
    return { ok: false, error: `Could not attach file: ${patchErr.message}` };
  }

  // Audit event.
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    user.id;
  await svc.from("internal_document_audit_events").insert({
    organization_id: membership.organizationId,
    internal_document_id: doc.id,
    event_type: "uploaded_file",
    actor_user_id: user.id,
    actor_display_snapshot: displayName,
    payload: {
      source: "export",
      format: parsed.data.format,
      filename,
      size: buffer.length,
    },
  });

  // Signed URL — short-lived, used immediately by the client for download.
  const { data: signed } = await svc.storage
    .from("regwatch-documents")
    .createSignedUrl(path, 60);

  revalidatePath(`/regwatch/documents/${doc.id}`);
  revalidatePath(`/regwatch/documents/${doc.id}/edit`);

  return {
    ok: true,
    filePath: path,
    fileName: filename,
    signedUrl: signed?.signedUrl,
  };
}
