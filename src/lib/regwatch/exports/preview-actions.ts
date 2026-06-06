"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { getMyMembership } from "@/lib/regwatch/members";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { bodyDocToPdfBuffer } from "./pm-to-pdf";

/**
 * On-demand PDF preview for the doc detail page.
 *
 * Generates a paged PDF from the current body_doc via the same pipeline
 * the user's "Save as PDF" export uses, but stores it under a hash-keyed
 * preview path (NOT the doc's canonical file_path). The doc detail
 * viewer renders this PDF via react-pdf so users see real 8.5x11 page
 * sheets with proper margins — matches what they'd download via Export.
 *
 * Caching: storage key includes a SHA-256 hash of body_doc + title, so:
 *   - Re-viewing the same doc reuses the cached PDF (signed URL fast)
 *   - After an autosave changes body_doc, the hash flips and we
 *     regenerate on the next preview load
 *   - Periodic cleanup of orphan _preview_*.pdf files is deferred to PR-6
 *
 * IMPORTANT: do NOT write to internal_documents.file_path — that field
 * is the user's canonical DOCX/PDF export, not a derived preview.
 */

interface PreviewResult {
  ok: boolean;
  error?: string;
  signedUrl?: string;
  /** True when the PDF was generated this request (vs served from cache). */
  generated?: boolean;
}

const inputSchema = z.object({ docId: z.string().uuid() });

export async function getDocumentPreviewPdf(
  input: unknown,
): Promise<PreviewResult> {
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
    return { ok: false, error: "Document has no editor body to preview" };
  }

  const title = (doc.title as string) ?? "Untitled";
  // Stable hash — JSON.stringify isn't deterministic across all input
  // shapes, but for our PM JSON (which has consistent key order from
  // both the editor and our seed templates) it's deterministic enough
  // that we get cache hits on unchanged content.
  const hash = createHash("sha256")
    .update(JSON.stringify(doc.body_doc) + "\x00" + title)
    .digest("hex")
    .slice(0, 16);
  const path = `${membership.organizationId}/${doc.id}/_preview_${hash}.pdf`;

  // Probe for an existing cache entry by trying a signed-URL fetch.
  const { data: existing } = await svc.storage
    .from("regwatch-documents")
    .createSignedUrl(path, 300);
  if (existing?.signedUrl) {
    // Verify the cached object actually exists — createSignedUrl returns
    // a URL even when the object isn't there. Quick HEAD via the
    // storage API list() is cheaper than a fetch().
    const { data: listing } = await svc.storage
      .from("regwatch-documents")
      .list(`${membership.organizationId}/${doc.id}`, {
        search: `_preview_${hash}.pdf`,
        limit: 1,
      });
    if (listing && listing.length > 0) {
      return { ok: true, signedUrl: existing.signedUrl, generated: false };
    }
  }

  // Generate.
  let buffer: Buffer;
  try {
    buffer = await bodyDocToPdfBuffer(doc.body_doc as unknown, { title });
  } catch (e) {
    return {
      ok: false,
      error: `Preview generation failed: ${(e as Error).message}`,
    };
  }

  const { error: upErr } = await svc.storage
    .from("regwatch-documents")
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) {
    return { ok: false, error: `Preview upload failed: ${upErr.message}` };
  }

  const { data: signed } = await svc.storage
    .from("regwatch-documents")
    .createSignedUrl(path, 300);
  if (!signed?.signedUrl) {
    return { ok: false, error: "Preview ready but signed URL unavailable" };
  }
  return { ok: true, signedUrl: signed.signedUrl, generated: true };
}
