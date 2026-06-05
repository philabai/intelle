import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

/**
 * Obligation evidence read-side. Mutations + uploads live in
 * evidence-actions.ts (server actions).
 */

export type EvidenceFileKind = "document" | "image" | "video";

export type EvidenceAnalysisStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type EvidenceAnalysisSignal =
  | "looks-compliant"
  | "concerns"
  | "non-compliant"
  | "inconclusive";

export type EvidenceFindingSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface EvidenceFinding {
  id: string;
  title: string;
  severity: EvidenceFindingSeverity;
  confidence: number;
  /** Where in the evidence this came from. */
  anchor: string | null;
  /** Clause / section of the regulation this discrepancy ties to. */
  regulation_citation_anchor: string | null;
  explanation: string;
  suggested_action: string | null;
  /** Reviewer acknowledgement metadata — populated by acknowledgeFinding. */
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  acknowledgement_note?: string | null;
}

export interface EvidenceFileRecord {
  id: string;
  organizationId: string;
  obligationId: string;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  fileKind: EvidenceFileKind;
  uploadedBy: string | null;
  uploadedByEmail: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
  analysisStatus: EvidenceAnalysisStatus;
  analysisStartedAt: string | null;
  analysisCompletedAt: string | null;
  analysisModel: string | null;
  analysisSummary: string | null;
  analysisFindings: EvidenceFinding[];
  analysisOverallSignal: EvidenceAnalysisSignal | null;
  analysisConfidence: number | null;
  analysisTokenUsage: Record<string, unknown>;
  analysisError: string | null;
  analysisAttemptCount: number;
  /** Whisper transcript for video evidence (null for docs / images). */
  analysisTranscript: string | null;
  /** Frames sampled for video analysis. */
  analysisKeyframeCount: number | null;
  /** Total video duration in seconds (best-effort from ffprobe). */
  analysisVideoDurationSec: number | null;
}

type Row = {
  id: string;
  organization_id: string;
  obligation_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  file_kind: EvidenceFileKind;
  uploaded_by: string | null;
  uploaded_at: string;
  analysis_status: EvidenceAnalysisStatus;
  analysis_started_at: string | null;
  analysis_completed_at: string | null;
  analysis_model: string | null;
  analysis_summary: string | null;
  analysis_findings: EvidenceFinding[] | null;
  analysis_overall_signal: EvidenceAnalysisSignal | null;
  analysis_confidence: number | null;
  analysis_token_usage: Record<string, unknown> | null;
  analysis_error: string | null;
  analysis_attempt_count: number;
  analysis_transcript: string | null;
  analysis_keyframe_count: number | null;
  analysis_video_duration_sec: number | null;
};

function rowToRecord(
  r: Row,
  uploader: { email: string | null; name: string | null } | null,
): EvidenceFileRecord {
  return {
    id: r.id,
    organizationId: r.organization_id,
    obligationId: r.obligation_id,
    filePath: r.file_path,
    fileName: r.file_name,
    fileSize: r.file_size,
    mimeType: r.mime_type,
    fileKind: r.file_kind,
    uploadedBy: r.uploaded_by,
    uploadedByEmail: uploader?.email ?? null,
    uploadedByName: uploader?.name ?? null,
    uploadedAt: r.uploaded_at,
    analysisStatus: r.analysis_status,
    analysisStartedAt: r.analysis_started_at,
    analysisCompletedAt: r.analysis_completed_at,
    analysisModel: r.analysis_model,
    analysisSummary: r.analysis_summary,
    analysisFindings: Array.isArray(r.analysis_findings)
      ? r.analysis_findings
      : [],
    analysisOverallSignal: r.analysis_overall_signal,
    analysisConfidence: r.analysis_confidence,
    analysisTokenUsage: r.analysis_token_usage ?? {},
    analysisError: r.analysis_error,
    analysisAttemptCount: r.analysis_attempt_count,
    analysisTranscript: r.analysis_transcript,
    analysisKeyframeCount: r.analysis_keyframe_count,
    analysisVideoDurationSec: r.analysis_video_duration_sec,
  };
}

export async function listEvidenceForObligation(
  obligationId: string,
): Promise<EvidenceFileRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligation_evidence_files")
    .select(
      `id, organization_id, obligation_id, file_path, file_name, file_size,
       mime_type, file_kind, uploaded_by, uploaded_at,
       analysis_status, analysis_started_at, analysis_completed_at,
       analysis_model, analysis_summary, analysis_findings,
       analysis_overall_signal, analysis_confidence, analysis_token_usage,
       analysis_error, analysis_attempt_count`,
    )
    .eq("obligation_id", obligationId)
    .order("uploaded_at", { ascending: false });
  if (error || !data) return [];

  // Enrich uploader email/name via service role (auth.users RLS-fenced).
  const svc = createServiceClient();
  const uploaderIds = Array.from(
    new Set(
      data
        .map((r) => r.uploaded_by as string | null)
        .filter((x): x is string => Boolean(x)),
    ),
  );
  const uploaderById = new Map<
    string,
    { email: string | null; name: string | null }
  >();
  for (const id of uploaderIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(id);
      if (u.user) {
        uploaderById.set(id, {
          email: u.user.email ?? null,
          name:
            (u.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    } catch {
      // best-effort
    }
  }

  return data.map((r) =>
    rowToRecord(
      r as unknown as Row,
      r.uploaded_by ? (uploaderById.get(r.uploaded_by as string) ?? null) : null,
    ),
  );
}

export async function getEvidenceFile(
  id: string,
): Promise<EvidenceFileRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligation_evidence_files")
    .select(
      `id, organization_id, obligation_id, file_path, file_name, file_size,
       mime_type, file_kind, uploaded_by, uploaded_at,
       analysis_status, analysis_started_at, analysis_completed_at,
       analysis_model, analysis_summary, analysis_findings,
       analysis_overall_signal, analysis_confidence, analysis_token_usage,
       analysis_error, analysis_attempt_count`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  let uploader: { email: string | null; name: string | null } | null = null;
  if (data.uploaded_by) {
    try {
      const svc = createServiceClient();
      const { data: u } = await svc.auth.admin.getUserById(
        data.uploaded_by as string,
      );
      uploader = u.user
        ? {
            email: u.user.email ?? null,
            name:
              (u.user.user_metadata?.full_name as string | undefined) ?? null,
          }
        : null;
    } catch {
      // ignore
    }
  }
  return rowToRecord(data as unknown as Row, uploader);
}

export async function getEvidenceSignedUrl(
  filePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("regwatch-documents")
    .createSignedUrl(filePath, 60);
  if (error || !data) {
    console.error("[regwatch] evidence signed url:", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Decide a file's kind from its MIME type. Falls back to extension when MIME
 * is generic (mobile uploads frequently come through as application/octet-stream).
 */
export function classifyFileKind(
  mimeType: string | null,
  fileName: string,
): EvidenceFileKind {
  const mt = (mimeType ?? "").toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (
    mt === "application/pdf" ||
    mt ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt === "application/msword" ||
    mt === "text/plain" ||
    mt.startsWith("text/")
  ) {
    return "document";
  }
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"].includes(ext))
    return "image";
  if (["mp4", "mov", "m4v", "webm", "mkv"].includes(ext)) return "video";
  if (["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext))
    return "document";
  return "document"; // safe default; analyser will fail-skip if it can't parse
}
