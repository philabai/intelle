"use client";

import { pdfjs } from "react-pdf";

/**
 * pdfjs worker source. The file is copied to /public/pdf-worker/ during
 * `npm install` via the postinstall script (cp from
 * node_modules/pdfjs-dist/build/pdf.worker.min.mjs).
 *
 * Self-hosted (no CDN) so the viewer works offline + isn't blocked by
 * any restrictive CSP.
 */
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";
}
