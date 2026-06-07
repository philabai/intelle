"use client";

import Link from "next/link";
import { useState } from "react";
import { DocPdfPreview } from "./DocPdfPreview";

interface Props {
  documentId: string;
  editHref: string;
  composeHref?: string;
  canEdit: boolean;
  hasBody: boolean;
  hasFile: boolean;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

/**
 * Document body preview card on the doc detail page.
 *
 *   - Hosts DocPdfPreview which renders the current body_doc as a real
 *     PDF (server-generated on-demand, cached by content hash) — gives
 *     authors a Word-quality multi-page preview that matches their
 *     DOCX/PDF export exactly.
 *   - Has its own bounded scrollbar (max-h: 75vh) so tall docs don't
 *     hijack the page.
 *   - Has zoom in / reset / zoom out controls (50%–200%).
 *   - Empty-state when the doc has no editor body (legacy upload-only
 *     docs or fresh blank docs).
 */
export function DocBodyPreviewCard({
  documentId,
  editHref,
  composeHref,
  canEdit,
  hasBody,
  hasFile,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const zoomPct = Math.round(zoom * 100);

  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }
  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  return (
    <div className="rounded-xl border border-card-border bg-card-bg/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Document body
        </h2>
        <div className="flex items-center gap-2">
          {hasBody && (
            <div className="inline-flex items-center overflow-hidden rounded-md border border-card-border bg-background">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                title="Zoom out"
                className="px-2 py-1 text-xs text-foreground/90 hover:bg-card-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                title="Reset zoom to 100%"
                className="border-x border-card-border px-2 py-1 font-mono text-[11px] text-foreground/90 hover:bg-card-bg"
              >
                {zoomPct}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                title="Zoom in"
                className="px-2 py-1 text-xs text-foreground/90 hover:bg-card-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}
          {canEdit && composeHref && (
            <Link
              href={composeHref}
              title="Open the side-by-side workspace — regulation on the left, editor on the right. Click 'Cite this clause' to insert a pinned citation pill."
              className="rounded-md border border-brand-teal/40 px-2.5 py-1 text-[11px] font-medium text-brand-teal hover:border-brand-teal hover:bg-brand-teal/10"
            >
              🔗 Citations
            </Link>
          )}
          {canEdit && (
            <Link
              href={editHref}
              className="rounded-md border border-brand-blue/40 px-2.5 py-1 text-[11px] font-medium text-brand-blue hover:border-brand-blue hover:bg-brand-blue/10"
            >
              {hasBody ? "Edit ✎" : "Start writing ✎"}
            </Link>
          )}
        </div>
      </div>

      {hasBody ? (
        <div className="max-h-[75vh] overflow-auto rounded-md bg-[#0a0e1a]">
          <DocPdfPreview documentId={documentId} zoom={zoom} />
        </div>
      ) : hasFile ? (
        <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
          This document is the uploaded file in the right sidebar. Click{" "}
          <strong>Start writing ✎</strong> to add a native body alongside it
          (existing file stays linked).
        </p>
      ) : (
        <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
          No body yet. Click <strong>Start writing ✎</strong> to author it
          in-app, or upload a file in the right sidebar.
        </p>
      )}
    </div>
  );
}
