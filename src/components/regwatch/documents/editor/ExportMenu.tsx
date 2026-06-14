"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { exportDocumentAsFile } from "@/lib/regwatch/exports/export-actions";

interface Props {
  documentId: string;
  onBeforeExport?: () => Promise<void>;
}

/**
 * "Export ▾" dropdown in the editor header. Two destinations:
 *   - DOCX (Word-compatible)
 *   - PDF
 *
 * Both run the server action which builds the file, uploads to storage,
 * and updates the document's file_path so the export becomes the
 * canonical artifact attached to the doc. The signed URL is then opened
 * in a new tab so the user gets an immediate download as well.
 *
 * `onBeforeExport` is the editor's flush-pending-autosave hook — we call
 * it first so the export reflects the user's latest typing.
 */
export function ExportMenu({ documentId, onBeforeExport }: Props) {
  const t = useTranslations("regwatch.documents");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  function run(format: "docx" | "pdf") {
    setError(null);
    startTransition(async () => {
      if (onBeforeExport) await onBeforeExport();
      const res = await exportDocumentAsFile({ docId: documentId, format });
      if (!res.ok) {
        setError(
          res.error ?? t("exportFailed", { format: format.toUpperCase() }),
        );
        return;
      }
      setOpen(false);
      if (res.signedUrl) {
        window.open(res.signedUrl, "_blank", "noopener,noreferrer");
      }
      // Refresh so the file panel on the detail page picks up the new
      // file_path, and the gallery card thumbnail re-renders.
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        title={t("exportButtonTitle")}
        className="rounded-md border border-card-border bg-background px-3 py-1.5 text-xs text-foreground/90 hover:border-brand-teal hover:text-brand-teal disabled:opacity-50"
      >
        {pending ? t("exporting") : t("exportMenu")}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-xl">
          <button
            type="button"
            onClick={() => run("docx")}
            className="block w-full px-3 py-2 text-start text-xs text-foreground hover:bg-brand-navy/40"
          >
            <p className="font-medium">{t("saveAsDocx")}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {t("saveAsDocxHint")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => run("pdf")}
            className="block w-full border-t border-card-border px-3 py-2 text-start text-xs text-foreground hover:bg-brand-navy/40"
          >
            <p className="font-medium">{t("saveAsPdf")}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              {t("saveAsPdfHint")}
            </p>
          </button>
          {error && (
            <p className="border-t border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
