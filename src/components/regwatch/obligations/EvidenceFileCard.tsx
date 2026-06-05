"use client";

import { useEffect, useState, useTransition } from "react";
import {
  rerunEvidenceAnalysis,
  deleteEvidence,
  getEvidenceFileSignedUrl,
} from "@/lib/regwatch/evidence-actions";
import type { EvidenceFileRecord } from "@/lib/regwatch/evidence";
import { FindingsPanel } from "./FindingsPanel";

interface Props {
  file: EvidenceFileRecord;
  canManage: boolean;
  canDelete: boolean;
  onChanged?: () => void;
}

const STATUS_COPY: Record<EvidenceFileRecord["analysisStatus"], string> = {
  pending: "Queued for analysis…",
  processing: "Analysing…",
  completed: "",
  failed: "Analysis failed",
  skipped: "Analysis skipped",
};

const STATUS_STYLE: Record<EvidenceFileRecord["analysisStatus"], string> = {
  pending: "bg-muted/20 text-muted",
  processing: "bg-brand-blue/20 text-foreground",
  completed: "bg-brand-teal/15 text-brand-teal",
  failed: "bg-red-500/20 text-red-200",
  skipped: "bg-amber-500/20 text-amber-200",
};

const SIGNAL_STYLE: Record<
  NonNullable<EvidenceFileRecord["analysisOverallSignal"]>,
  string
> = {
  "looks-compliant": "bg-brand-teal/15 text-brand-teal",
  concerns: "bg-amber-500/20 text-amber-200",
  "non-compliant": "bg-red-500/25 text-red-200",
  inconclusive: "bg-muted/20 text-muted",
};

const KIND_LABEL: Record<EvidenceFileRecord["fileKind"], string> = {
  document: "Document",
  image: "Image",
  video: "Video",
};

export function EvidenceFileCard({
  file,
  canManage,
  canDelete,
  onChanged,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const statusLabel =
    file.analysisStatus === "completed"
      ? `${file.analysisFindings.length} finding${file.analysisFindings.length === 1 ? "" : "s"}`
      : STATUS_COPY[file.analysisStatus];

  // Fetch signed URL on demand. Cached per-card and refreshed when expired.
  async function fetchSignedUrl(): Promise<string | null> {
    if (signedUrl) return signedUrl;
    setSigning(true);
    const res = await getEvidenceFileSignedUrl({ evidenceFileId: file.id });
    setSigning(false);
    if (res.ok && res.url) {
      setSignedUrl(res.url);
      // 60s TTL — invalidate after 55s so the next click re-fetches.
      setTimeout(() => setSignedUrl(null), 55_000);
      return res.url;
    }
    return null;
  }

  // For images + videos, auto-load the preview when the card mounts so the
  // admin sees the actual media without an extra click per file.
  useEffect(() => {
    if (
      (file.fileKind === "image" || file.fileKind === "video") &&
      file.analysisStatus !== "pending"
    ) {
      void fetchSignedUrl().then((url) => {
        if (url) setShowImage(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.fileKind]);

  async function onOpenFile() {
    const url = await fetchSignedUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function onRerun() {
    startTransition(async () => {
      const res = await rerunEvidenceAnalysis({ evidenceFileId: file.id });
      if (res.ok) onChanged?.();
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete ${file.fileName}? This can't be undone.`))
      return;
    startTransition(async () => {
      const res = await deleteEvidence({ evidenceFileId: file.id });
      if (res.ok) onChanged?.();
    });
  }

  return (
    <article className="rounded-xl border border-card-border bg-card-bg/40 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted">
              {KIND_LABEL[file.fileKind]}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wider ${STATUS_STYLE[file.analysisStatus]}`}
            >
              {statusLabel || file.analysisStatus}
            </span>
            {file.analysisOverallSignal && (
              <span
                className={`rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wider ${SIGNAL_STYLE[file.analysisOverallSignal]}`}
              >
                {file.analysisOverallSignal.replace("-", " ")}
              </span>
            )}
            {file.analysisConfidence !== null && (
              <span className="text-muted">
                conf {(file.analysisConfidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {file.fileName}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Uploaded{" "}
            {new Date(file.uploadedAt).toLocaleString()}
            {file.uploadedByName || file.uploadedByEmail
              ? ` by ${file.uploadedByName ?? file.uploadedByEmail}`
              : ""}
            {file.fileSize
              ? ` · ${(file.fileSize / 1024).toFixed(1)} KB`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenFile}
            disabled={signing}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-teal disabled:opacity-50"
          >
            {signing ? "Loading…" : "Open file ↗"}
          </button>
          {canManage && file.analysisStatus !== "pending" &&
            file.analysisStatus !== "processing" && (
              <button
                type="button"
                onClick={onRerun}
                disabled={pending}
                className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-blue disabled:opacity-50"
              >
                Re-run analysis
              </button>
            )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="rounded-md border border-red-500/40 bg-transparent px-2 py-1 text-[10px] text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      {showImage && signedUrl && file.fileKind === "image" && (
        <div className="mt-3 overflow-hidden rounded-md border border-card-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={file.fileName}
            className="max-h-[480px] w-full object-contain"
          />
        </div>
      )}

      {showImage && signedUrl && file.fileKind === "video" && (
        <div className="mt-3 overflow-hidden rounded-md border border-card-border bg-black">
          <video
            src={signedUrl}
            controls
            preload="metadata"
            className="max-h-[480px] w-full"
          >
            Your browser does not support inline video. Use Open file ↗ above.
          </video>
        </div>
      )}

      {file.fileKind === "video" &&
        file.analysisStatus === "completed" &&
        (file.analysisKeyframeCount != null ||
          file.analysisVideoDurationSec != null) && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">
            {file.analysisVideoDurationSec != null
              ? `Video ${formatDuration(file.analysisVideoDurationSec)}`
              : "Video"}
            {file.analysisKeyframeCount != null
              ? ` · ${file.analysisKeyframeCount} keyframes analysed`
              : ""}
          </p>
        )}

      {file.analysisStatus === "completed" && (
        <div className="mt-3 space-y-3">
          {file.analysisSummary && (
            <p className="rounded-md border border-card-border bg-card-bg/30 p-2.5 text-xs text-foreground/90">
              {file.analysisSummary}
            </p>
          )}
          {file.fileKind === "video" && file.analysisTranscript && (
            <details className="rounded-md border border-card-border bg-card-bg/30">
              <summary className="cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-medium text-foreground/90 hover:text-brand-teal">
                Audio transcript
              </summary>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-card-border bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground/90">
                {file.analysisTranscript}
              </pre>
            </details>
          )}
          <FindingsPanel
            evidenceFileId={file.id}
            findings={file.analysisFindings}
            canAcknowledge={canManage}
            onChanged={onChanged}
          />
        </div>
      )}

      {file.analysisStatus === "failed" && file.analysisError && (
        <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {file.analysisError}
          {canManage && (
            <>
              {" "}
              <button
                type="button"
                onClick={onRerun}
                className="underline hover:text-red-100"
              >
                Try again
              </button>
            </>
          )}
        </p>
      )}

      {file.analysisStatus === "skipped" && file.analysisError && (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
          {file.analysisError}
        </p>
      )}
    </article>
  );
}

function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
