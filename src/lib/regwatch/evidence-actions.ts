"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { transcribeAudio, isAsrConfigured } from "@/lib/llm/asr";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";
import { classifyFileKind, type EvidenceFinding } from "./evidence";
import { validateUpload, EVIDENCE_PROFILE } from "@/lib/upload-validation";

/**
 * Server actions for the per-file evidence flow. Replaces the legacy
 * single-file uploadObligationEvidence path — that one stays in
 * obligations-actions.ts for backward-compat with anything still calling
 * it, but the workflow dialog now writes through these multi-file actions.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  filePath?: string;
}

async function ensureEvidenceContext(): Promise<
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
  const gate = await checkFeatureGate("compliance_obligations");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Evidence requires the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  return {
    ok: true,
    organizationId: membership.organizationId,
    userId: user.id,
    isAdmin: membership.role === "owner" || membership.role === "admin",
  };
}

const evalSchema = z.object({
  obligationId: z.string().uuid(),
  evidenceFileId: z.string().uuid(),
  text: z.string().max(8000),
});

export interface EvidenceHumanEvaluation {
  text: string;
  by_name: string;
  at: string;
}

/**
 * Save (or clear, when text is empty) a reviewer's human evaluation of one
 * evidence file's AI analysis. Stored on the obligation's review_notes JSONB
 * under `evidence_evaluations[fileId]` so no schema change is needed. Only an
 * admin or the assigned reviewer can write one.
 */
export async function saveEvidenceEvaluation(
  input: z.infer<typeof evalSchema>,
): Promise<ActionResult> {
  const parsed = evalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: obl, error: e1 } = await supabase
    .from("compliance_obligations")
    .select("review_notes, assigned_reviewer_user_id")
    .eq("id", parsed.data.obligationId)
    .maybeSingle();
  if (e1 || !obl) return { ok: false, error: e1?.message ?? "Obligation not found" };

  const isReviewer = obl.assigned_reviewer_user_id === ctx.userId;
  if (!ctx.isAdmin && !isReviewer) {
    return { ok: false, error: "Only the assigned reviewer or an admin can add an evaluation." };
  }

  const notes = (obl.review_notes as Record<string, unknown>) ?? {};
  const evals = { ...((notes.evidence_evaluations as Record<string, unknown>) ?? {}) };
  const text = parsed.data.text.trim();
  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Reviewer";
  if (text) {
    evals[parsed.data.evidenceFileId] = {
      text,
      by_name: name,
      by_user_id: ctx.userId,
      at: new Date().toISOString(),
    };
  } else {
    delete evals[parsed.data.evidenceFileId];
  }

  const { error: e2 } = await supabase
    .from("compliance_obligations")
    .update({ review_notes: { ...notes, evidence_evaluations: evals } })
    .eq("id", parsed.data.obligationId);
  if (e2) return { ok: false, error: e2.message };

  revalidatePath(`/regwatch/obligations/${parsed.data.obligationId}`);
  return { ok: true };
}

/**
 * Transcribe a short voice recording into text for the human-evaluation field.
 * Uses Whisper's translation endpoint so a note dictated in any language
 * (common in the field) comes back as English the reviewer can edit + save.
 */
export async function transcribeEvidenceAudio(
  formData: FormData,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;
  const audio = formData.get("audio");
  if (!(audio instanceof File)) return { ok: false, error: "No audio supplied" };
  if (audio.size < 1200) return { ok: false, error: "Recording too short — try again." };
  if (audio.size > 25 * 1024 * 1024) {
    return { ok: false, error: "Recording too long (max ~25 MB / a few minutes)." };
  }
  if (!isAsrConfigured()) {
    return { ok: false, error: "Voice transcription isn't configured." };
  }
  try {
    const res = await transcribeAudio({
      audio: Buffer.from(await audio.arrayBuffer()),
      fileName: audio.name || "recording.webm",
      mimeType: audio.type || "audio/webm",
      mode: "translate",
    });
    const text = res.text;
    if (!text) return { ok: false, error: "Couldn't make out any speech — try again." };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: `Transcription failed: ${(e as Error).message}` };
  }
}

/**
 * Upload a single evidence file for an obligation. The reviewer-facing UI
 * calls this once per file from a multi-file dropzone; each call writes
 * to storage + inserts one obligation_evidence_files row in `pending`
 * state. The analyse-evidence cron picks the row up async.
 */
export async function uploadObligationEvidenceFile(
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;

  const obligationId = formData.get("obligationId");
  const file = formData.get("file");
  if (typeof obligationId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Missing obligationId or file" };
  }
  const valid = validateUpload(file, EVIDENCE_PROFILE);
  if (!valid.ok) return { ok: false, error: valid.error };

  const svc = createServiceClient();
  const { data: obligation } = await svc
    .from("compliance_obligations")
    .select("id, organization_id, assigned_reviewer_user_id")
    .eq("id", obligationId)
    .maybeSingle();
  if (!obligation || obligation.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Obligation not found in your org" };
  }
  const isReviewer = obligation.assigned_reviewer_user_id === ctx.userId;
  if (!isReviewer && !ctx.isAdmin) {
    return {
      ok: false,
      error: "Only the assigned reviewer or admins can upload evidence",
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 200);
  const path = `${ctx.organizationId}/obligations/${obligationId}/evidence/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await svc.storage
    .from("regwatch-documents")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const fileKind = classifyFileKind(file.type || null, file.name);

  const { data: inserted, error: insErr } = await svc
    .from("obligation_evidence_files")
    .insert({
      organization_id: ctx.organizationId,
      obligation_id: obligationId,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      file_kind: fileKind,
      uploaded_by: ctx.userId,
    })
    .select("id")
    .single();
  if (insErr) return { ok: false, error: insErr.message };

  // Also write the file path into the obligation's primary `evidence_file_path`
  // for backward compat with the existing state-machine precondition (still
  // checked while we migrate). First file wins; replacements (re-uploads)
  // overwrite. Skipping the write if the column is already populated.
  await svc
    .from("compliance_obligations")
    .update({ evidence_file_path: path })
    .eq("id", obligationId)
    .is("evidence_file_path", null);

  revalidatePath(`/regwatch/obligations/${obligationId}`);
  return { ok: true, id: inserted?.id as string, filePath: path };
}

// ---------------------------------------------------------------------------
// Finding acknowledgement — reviewer addresses or accepts a finding
// ---------------------------------------------------------------------------

const ackSchema = z.object({
  evidenceFileId: z.string().uuid(),
  findingId: z.string(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function acknowledgeFinding(
  input: unknown,
): Promise<ActionResult> {
  const parsed = ackSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("obligation_evidence_files")
    .select("id, organization_id, obligation_id, analysis_findings")
    .eq("id", parsed.data.evidenceFileId)
    .maybeSingle();
  if (!row || row.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Evidence file not found in your org" };
  }

  const findings = Array.isArray(row.analysis_findings)
    ? (row.analysis_findings as EvidenceFinding[])
    : [];
  const next = findings.map((f) =>
    f.id === parsed.data.findingId
      ? {
          ...f,
          acknowledged_by: ctx.userId,
          acknowledged_at: new Date().toISOString(),
          acknowledgement_note: parsed.data.note ?? null,
        }
      : f,
  );

  const { error } = await svc
    .from("obligation_evidence_files")
    .update({ analysis_findings: next })
    .eq("id", parsed.data.evidenceFileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/regwatch/obligations/${row.obligation_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Re-run analysis — bumps attempt count, flips to pending so the cron picks
// it up again. Admins or the original reviewer can trigger.
// ---------------------------------------------------------------------------

const rerunSchema = z.object({ evidenceFileId: z.string().uuid() });

export async function rerunEvidenceAnalysis(
  input: unknown,
): Promise<ActionResult> {
  const parsed = rerunSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("obligation_evidence_files")
    .select(
      "id, organization_id, obligation_id, uploaded_by, analysis_attempt_count",
    )
    .eq("id", parsed.data.evidenceFileId)
    .maybeSingle();
  if (!row || row.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Evidence file not found in your org" };
  }
  if (row.uploaded_by !== ctx.userId && !ctx.isAdmin) {
    return {
      ok: false,
      error: "Only the uploader or admins can re-run analysis",
    };
  }

  const { error } = await svc
    .from("obligation_evidence_files")
    .update({
      analysis_status: "pending",
      analysis_started_at: null,
      analysis_completed_at: null,
      analysis_error: null,
      analysis_attempt_count: (row.analysis_attempt_count as number) + 1,
    })
    .eq("id", parsed.data.evidenceFileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/regwatch/obligations/${row.obligation_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signed-URL fetcher — client components call this to get a short-lived
// download URL when the user clicks "Open file" or to load an inline image.
// ---------------------------------------------------------------------------

const signedUrlSchema = z.object({ evidenceFileId: z.string().uuid() });

export async function getEvidenceFileSignedUrl(
  input: unknown,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const parsed = signedUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("obligation_evidence_files")
    .select("id, organization_id, file_path")
    .eq("id", parsed.data.evidenceFileId)
    .maybeSingle();
  if (!row || row.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Evidence file not found in your org" };
  }
  const { data, error } = await svc.storage
    .from("regwatch-documents")
    .createSignedUrl(row.file_path as string, 60);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not sign URL" };
  }
  return { ok: true, url: data.signedUrl };
}

// ---------------------------------------------------------------------------
// Delete evidence — admin only
// ---------------------------------------------------------------------------

const deleteSchema = z.object({ evidenceFileId: z.string().uuid() });

export async function deleteEvidence(input: unknown): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureEvidenceContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin) {
    return { ok: false, error: "Only owners and admins can delete evidence" };
  }

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("obligation_evidence_files")
    .select("id, organization_id, obligation_id, file_path")
    .eq("id", parsed.data.evidenceFileId)
    .maybeSingle();
  if (!row || row.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Evidence file not found in your org" };
  }

  // Remove storage object first (best-effort), then DB row.
  await svc.storage
    .from("regwatch-documents")
    .remove([row.file_path as string]);
  const { error } = await svc
    .from("obligation_evidence_files")
    .delete()
    .eq("id", parsed.data.evidenceFileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/regwatch/obligations/${row.obligation_id}`);
  return { ok: true };
}
