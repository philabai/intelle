"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("regwatch.documents");
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
          {t("bodyPreviewIsFile")}
          {canEdit && (
            <>
              {" "}
              {t.rich("bodyPreviewFileEditHint", {
                edit: (chunks) => (
                  <a
                    href={editHref}
                    className="font-medium text-brand-blue hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </>
          )}
        </>
      ) : (
        <>
          {t("bodyPreviewNoBody")}
          {canEdit && (
            <>
              {" "}
              {t.rich("bodyPreviewNoBodyEditHint", {
                edit: (chunks) => (
                  <a
                    href={editHref}
                    className="font-medium text-brand-blue hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
