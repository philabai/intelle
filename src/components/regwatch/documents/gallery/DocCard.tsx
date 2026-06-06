import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import {
  DOCUMENT_KIND_LABEL,
  type InternalDocumentListItem,
  type InternalDocumentReviewState,
} from "@/lib/regwatch/internal-documents";
import { DocThumbnail } from "./DocThumbnail";

interface Props {
  doc: InternalDocumentListItem;
}

const REVIEW_STATE_LABEL: Record<InternalDocumentReviewState, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  effective: "Effective",
  superseded: "Superseded",
};

const REVIEW_STATE_TONE: Record<InternalDocumentReviewState, string> = {
  draft: "bg-card-bg/60 text-muted border-card-border",
  in_review: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  approved: "bg-brand-blue/15 text-brand-blue border-brand-blue/40",
  effective: "bg-brand-teal/15 text-brand-teal border-brand-teal/40",
  superseded: "bg-card-bg/40 text-muted border-card-border line-through",
};

/**
 * Document card — Google-Docs-inspired tile. Thumbnail on top, title + meta
 * underneath. Server component since thumbnail rendering is pure-Node via
 * @tiptap/html.
 */
export async function DocCard({ doc }: Props) {
  // Body_doc isn't on the list item shape — fetch it separately. The card
  // is server-rendered so this is cheap and goes through the service
  // client (RLS still gates by org_id below).
  const svc = createServiceClient();
  const { data: bodyRow } = await svc
    .from("internal_documents")
    .select("body_doc, mime_type")
    .eq("id", doc.id)
    .maybeSingle();
  const bodyDoc = (bodyRow?.body_doc as unknown) ?? null;
  const mimeType = (bodyRow?.mime_type as string | null) ?? null;

  const ownerInitial = (doc.ownerName ?? doc.ownerEmail ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  const ownerTitle = doc.ownerName ?? doc.ownerEmail ?? "Unknown owner";

  return (
    <Link
      href={`/regwatch/documents/${doc.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/30 transition hover:border-brand-blue/60 hover:bg-card-bg/50"
    >
      <DocThumbnail
        bodyDoc={bodyDoc}
        filePath={doc.filePath}
        fileName={doc.fileName}
        mimeType={mimeType}
        title={doc.title}
        docKind={doc.docKind}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p
            className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-brand-teal"
            title={doc.title}
          >
            {doc.title}
          </p>
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${REVIEW_STATE_TONE[doc.reviewState]}`}
            title={`Review state: ${REVIEW_STATE_LABEL[doc.reviewState]}`}
          >
            {REVIEW_STATE_LABEL[doc.reviewState]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted">
          <span className="rounded bg-card-bg/60 px-1.5 py-0.5 font-medium uppercase tracking-wider">
            {DOCUMENT_KIND_LABEL[doc.docKind]}
          </span>
          {doc.internalCode && (
            <span className="font-mono">{doc.internalCode}</span>
          )}
          {doc.version && <span>· {doc.version}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[10px] text-muted">
          <div className="flex items-center gap-1.5">
            <span
              title={ownerTitle}
              className="grid h-5 w-5 place-items-center rounded-full bg-brand-blue/20 text-[10px] font-medium text-brand-blue"
            >
              {ownerInitial}
            </span>
            <span className="truncate" title={ownerTitle}>
              {doc.ownerName ?? doc.ownerEmail ?? "—"}
            </span>
          </div>
          <span title={new Date(doc.updatedAt).toLocaleString()}>
            {formatDistanceToNowStrict(new Date(doc.updatedAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {(doc.linkCount > 0 || doc.assetLinkCount > 0) && (
          <div className="flex items-center gap-1 pt-1 text-[9px]">
            {doc.linkCount > 0 && (
              <span
                className="rounded-md bg-brand-teal/15 px-1.5 py-0.5 font-mono text-brand-teal"
                title={`${doc.linkCount} regulation link${doc.linkCount === 1 ? "" : "s"}`}
              >
                {doc.linkCount} reg
              </span>
            )}
            {doc.assetLinkCount > 0 && (
              <span
                className="rounded-md bg-brand-blue/15 px-1.5 py-0.5 font-mono text-brand-blue"
                title={`${doc.assetLinkCount} asset link${doc.assetLinkCount === 1 ? "" : "s"}`}
              >
                {doc.assetLinkCount} asset
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
