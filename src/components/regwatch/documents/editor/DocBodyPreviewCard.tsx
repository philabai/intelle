"use client";

import { DocPdfPreview } from "./DocPdfPreview";

interface Props {
  documentId: string;
  hasBody: boolean;
  hasFile: boolean;
  zoom: number;
  canEdit: boolean;
  editHref: string;
}

/**
 * Body preview card — header-less. The "Document body" title + zoom +
 * Edit + Citations actions all live in the DocActionsClient action bar
 * above the card. This component just renders the body content (or its
 * empty state) inside a bounded scroll container.
 */
export function DocBodyPreviewCard({
  documentId,
  hasBody,
  hasFile,
  zoom,
  canEdit,
  editHref,
}: Props) {
  if (hasBody) {
    return (
      <div className="rounded-xl border border-card-border bg-card-bg/40 p-3">
        <div className="max-h-[75vh] overflow-auto rounded-md bg-[#0a0e1a]">
          <DocPdfPreview documentId={documentId} zoom={zoom} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-xs text-muted">
      {hasFile ? (
        <>
          This document is the uploaded file in the right sidebar.
          {canEdit && (
            <>
              {" "}
              Click{" "}
              <a
                href={editHref}
                className="font-medium text-brand-blue hover:underline"
              >
                Edit ✎
              </a>{" "}
              in the action bar above to add a native body alongside it.
            </>
          )}
        </>
      ) : (
        <>
          No body yet.
          {canEdit && (
            <>
              {" "}
              Click{" "}
              <a
                href={editHref}
                className="font-medium text-brand-blue hover:underline"
              >
                Edit ✎
              </a>{" "}
              in the action bar above to start writing.
            </>
          )}
        </>
      )}
    </div>
  );
}
