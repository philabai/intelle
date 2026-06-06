"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getDocumentPreviewPdf } from "@/lib/regwatch/exports/preview-actions";
import "./pdf-worker-setup";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const Document = dynamic(
  () => import("react-pdf").then((m) => m.Document),
  { ssr: false, loading: () => <PdfLoading /> },
);
const Page = dynamic(
  () => import("react-pdf").then((m) => m.Page),
  { ssr: false },
);

interface Props {
  documentId: string;
  zoom: number;
}

/**
 * Renders a paged PDF preview generated on demand from the document's
 * current body_doc. Pixel-identical to the user's DOCX/PDF export — real
 * 8.5×11 page sheets with proper 1in margins and real page breaks at
 * the positions the editor places them.
 */
export function DocPdfPreview({ documentId, zoom }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    setError(null);
    setUrl(null);
    setPages(0);
    getDocumentPreviewPdf({ docId: documentId })
      .then((res) => {
        if (cancelled) return;
        setGenerating(false);
        if (!res.ok || !res.signedUrl) {
          setError(res.error ?? "Preview unavailable");
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
      <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
        {error}
      </p>
    );
  }
  if (generating || !url) {
    return <PdfLoading />;
  }

  // Width in CSS pixels for each rendered Page. 8.5in × 96dpi = 816px is
  // the natural sheet width; zoom is applied as a scale multiplier so
  // the rendered canvas size grows proportionally.
  const pageWidth = Math.round(8.5 * 96 * zoom);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setPages(numPages)}
        onLoadError={(e) => setError(e.message)}
        loading={<PdfLoading />}
      >
        {Array.from({ length: pages }).map((_, i) => (
          <div
            key={i}
            className="mb-4 overflow-hidden rounded-sm border border-card-border bg-white shadow-2xl shadow-black/50"
          >
            <Page
              pageNumber={i + 1}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}

function PdfLoading() {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-muted">
      Generating preview…
    </div>
  );
}
