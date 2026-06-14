"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker setup runs at module evaluation time — before any <Document /> or
// <Page /> component renders. The worker file is copied from
// `node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
// to `/public/pdf-worker/` via the package.json postinstall script, so
// the version always matches whatever pdfjs-dist react-pdf bundles.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";

interface Props {
  url: string;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (message: string) => void;
  numPages: number;
}

const SIDE_GUTTER = 24; // px breathing room around each rendered page

/**
 * Renders the doc as a stack of paper sheets. At zoom=1 the page fits
 * the container width (Word's "Fit Width" / Google Docs default behavior);
 * zoom < 1 leaves whitespace; zoom > 1 overflows horizontally with the
 * scroll container.
 */
export default function PdfViewer({
  url,
  zoom,
  onLoadSuccess,
  onLoadError,
  numPages,
}: Props) {
  const t = useTranslations("regwatch.documents");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerWidth(e.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Base width = the available container width minus a tiny gutter so
  // the page sheet doesn't kiss the scroll bar.
  const baseWidth = Math.max(200, containerWidth - SIDE_GUTTER);
  const pageWidth = Math.round(baseWidth * zoom);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 py-4"
    >
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
        onLoadError={(e) => onLoadError(e.message)}
        loading={
          <div className="flex h-40 items-center justify-center text-xs text-muted">
            {t("loadingPreview")}
          </div>
        }
      >
        {containerWidth > 0 &&
          Array.from({ length: numPages }).map((_, i) => (
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
