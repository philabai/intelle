"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { uploadDocumentFile } from "@/lib/regwatch/internal-documents-actions";

interface Props {
  documentId: string;
  currentFileName: string | null;
}

export function UploadFileForm({ documentId, currentFileName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("file", file);
    startTransition(async () => {
      const res = await uploadDocumentFile(formData);
      if (!res.ok) {
        setError(res.error ?? "Upload failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue">
        {pending
          ? "Uploading…"
          : currentFileName
            ? "Replace file"
            : "Upload file"}
        <input
          type="file"
          className="hidden"
          onChange={onChange}
          disabled={pending}
        />
      </label>
      {currentFileName && (
        <span className="text-[11px] text-muted">
          Current: <span className="font-mono">{currentFileName}</span>
        </span>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
