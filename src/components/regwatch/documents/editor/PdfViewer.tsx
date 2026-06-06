"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker setup runs at module evaluation time — before any <Document /> or
// <Page /> component renders. The worker file is copied from
// `node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
// to `/public/pdf-worker/` via the package.json postinstall script, so
// the version always matches whatever pdfjs-dist react-pdf bundles.
// Without this, react-pdf falls back to a "fake worker" that fails with
// "Failed to resolve module specifier 'pdf.worker.mjs'".
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";

interface Props {
  url: string;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (message: string) => void;
  numPages: number;
}

export default function PdfViewer({
  url,
  zoom,
  onLoadSuccess,
  onLoadError,
  numPages,
}: Props) {
  const pageWidth = Math.round(8.5 * 96 * zoom);
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
        onLoadError={(e) => onLoadError(e.message)}
        loading={
          <div className="flex h-40 items-center justify-center text-xs text-muted">
            Loading preview…
          </div>
        }
      >
        {Array.from({ length: numPages }).map((_, i) => (
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
