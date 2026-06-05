"use client";

import { useTransition } from "react";
import {
  rerunEvidenceAnalysis,
  deleteEvidence,
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

  const statusLabel =
    file.analysisStatus === "completed"
      ? `${file.analysisFindings.length} finding${file.analysisFindings.length === 1 ? "" : "s"}`
      : STATUS_COPY[file.analysisStatus];

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

      {file.analysisStatus === "completed" && (
        <div className="mt-3 space-y-3">
          {file.analysisSummary && (
            <p className="rounded-md border border-card-border bg-card-bg/30 p-2.5 text-xs text-foreground/90">
              {file.analysisSummary}
            </p>
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
