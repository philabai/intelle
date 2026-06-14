"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  uploadObligationEvidenceFile,
  type EvidenceHumanEvaluation,
} from "@/lib/regwatch/evidence-actions";
import type { EvidenceFileRecord } from "@/lib/regwatch/evidence";
import { EvidenceFileCard } from "./EvidenceFileCard";

interface Props {
  obligationId: string;
  /** Existing evidence files (passed from server). */
  initialFiles: EvidenceFileRecord[];
  /** Current user can manage / acknowledge findings. */
  canManage: boolean;
  /** Current user can delete files (admin only). */
  canDelete: boolean;
  /** Per-file human evaluations, keyed by evidence file id. */
  evaluations?: Record<string, EvidenceHumanEvaluation>;
  /** Called when the file list changes (so the workflow can re-check). */
  onFilesChanged?: (count: number) => void;
}

interface UploadingItem {
  id: string;
  fileName: string;
  size: number;
  status: "uploading" | "failed";
  error?: string;
}

/**
 * Reviewer-facing multi-file dropzone for obligation evidence. Each file
 * uploads independently — failures don't block other files. Status pills
 * update as `analysis_status` advances via background polling (every 4s
 * while any file is `pending` or `processing`).
 */
export function EvidenceDropzone({
  obligationId,
  initialFiles,
  canManage,
  canDelete,
  evaluations,
  onFilesChanged,
}: Props) {
  const t = useTranslations("regwatch.comply");
  const router = useRouter();
  const [files, setFiles] = useState<EvidenceFileRecord[]>(initialFiles);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [_pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Poll for analysis status updates while any file is pending/processing.
  useEffect(() => {
    const stillRunning = files.some(
      (f) =>
        f.analysisStatus === "pending" || f.analysisStatus === "processing",
    );
    if (!stillRunning) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [files, router]);

  // Sync from server props (when router.refresh() lands).
  useEffect(() => {
    setFiles(initialFiles);
    onFilesChanged?.(initialFiles.length);
  }, [initialFiles, onFilesChanged]);

  function handleSelected(selected: FileList | File[]) {
    const arr = Array.from(selected);
    if (arr.length === 0) return;

    const placeholders: UploadingItem[] = arr.map((f) => ({
      id: `upl-${crypto.randomUUID()}`,
      fileName: f.name,
      size: f.size,
      status: "uploading",
    }));
    setUploading((u) => [...u, ...placeholders]);

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const ph = placeholders[i];
      startTransition(async () => {
        const formData = new FormData();
        formData.set("obligationId", obligationId);
        formData.set("file", file);
        const res = await uploadObligationEvidenceFile(formData);
        if (!res.ok) {
          setUploading((u) =>
            u.map((p) =>
              p.id === ph.id
                ? { ...p, status: "failed", error: res.error }
                : p,
            ),
          );
          return;
        }
        // Drop the placeholder and let router.refresh() bring the new row.
        setUploading((u) => u.filter((p) => p.id !== ph.id));
        router.refresh();
      });
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleSelected(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-brand-teal bg-brand-teal/5"
            : "border-card-border bg-card-bg/30 hover:border-brand-blue"
        }`}
      >
        <p className="text-sm text-foreground">
          {t("dropzoneTitle")}
        </p>
        <p className="mt-1 text-[11px] text-muted">
          {t("dropzoneHint")}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files) handleSelected(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {uploading.length > 0 && (
        <ul className="space-y-2">
          {uploading.map((u) => (
            <li
              key={u.id}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${
                u.status === "failed"
                  ? "border-red-500/40 bg-red-500/5 text-red-200"
                  : "border-card-border bg-card-bg/40 text-foreground"
              }`}
            >
              <span className="truncate">
                {u.fileName}{" "}
                <span className="text-muted">
                  · {(u.size / 1024).toFixed(1)} KB
                </span>
              </span>
              <span>
                {u.status === "uploading"
                  ? t("uploading")
                  : t("uploadFailed", { error: u.error ?? "" })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((f) => (
            <EvidenceFileCard
              key={f.id}
              file={f}
              canManage={canManage}
              canDelete={canDelete}
              humanEvaluation={evaluations?.[f.id] ?? null}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
