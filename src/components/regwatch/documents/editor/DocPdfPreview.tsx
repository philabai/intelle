"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getDocumentPreviewPdf } from "@/lib/regwatch/exports/preview-actions";

/**
 * Renders a paged PDF preview generated on demand from the document's
 * current body_doc. Pixel-identical to the user's DOCX/PDF export — real
 * 8.5x11 page sheets with proper 1in margins and real page breaks at
 * the positions the editor places them.
 *
 * react-pdf is loaded via a SINGLE dynamic import (PdfViewer) with
 * ssr:false. PdfViewer sets pdfjs.GlobalWorkerOptions.workerSrc at its
 * module top, so the worker config is guaranteed to apply before any
 * <Document /> / <Page /> initialises.
 */

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <PdfLoading />,
});

function PdfLoading() {
  const t = useTranslations("regwatch.documents");
  return (
    <div className="flex h-40 items-center justify-center text-xs text-muted">
      {t("generatingPreview")}
    </div>
  );
}

interface Props {
  documentId: string;
  zoom: number;
}

export function DocPdfPreview({ documentId, zoom }: Props) {
  const t = useTranslations("regwatch.documents");
  const [url, setUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    setError(null);
    setUrl(null);
    setNumPages(0);
    getDocumentPreviewPdf({ docId: documentId })
      .then((res) => {
        if (cancelled) return;
        setGenerating(false);
        if (!res.ok || !res.signedUrl) {
          setError(res.error ?? t("previewUnavailable"));
          return;
        }
        setUrl(res.signedUrl);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setGenerating(false);
        setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (error) {
    return (
      <p className="m-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
        {error}
      </p>
    );
  }
  if (generating || !url) {
    return <PdfLoading />;
  }

  return (
    <PdfViewer
      url={url}
      zoom={zoom}
      numPages={numPages}
      onLoadSuccess={setNumPages}
      onLoadError={setError}
    />
  );
}
