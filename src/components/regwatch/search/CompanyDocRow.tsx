import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import type { CompanyDocResult } from "@/lib/regwatch/internal-document-search";

const KIND_LABELS: Record<string, string> = {
  sop: "SOP",
  policy: "Policy",
  permit: "Permit",
  "work-instruction": "Work instruction",
  "training-material": "Training material",
  "validation-protocol": "Validation protocol",
  "risk-assessment": "Risk assessment",
  "internal-standard": "Internal standard",
  other: "Document",
};

function kindLabel(kind: string): string {
  return (
    KIND_LABELS[kind] ??
    kind.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Render a ts_headline snippet (highlights wrapped in ⟦…⟧) as escaped text. */
function renderSnippet(snippet: string) {
  return snippet.split(/⟦|⟧/).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-brand-teal/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * One internal "Company Document" search result. Links to the document detail
 * page; mirrors RegulationRow's shape but with doc-specific metadata.
 */
export function CompanyDocRow({ doc }: { doc: CompanyDocResult }) {
  let updated = "";
  try {
    updated = formatDistanceToNowStrict(new Date(doc.updatedAt), {
      addSuffix: true,
    });
  } catch {
    /* ignore bad dates */
  }

  return (
    <Link
      href={`/regwatch/documents/${doc.id}`}
      className="block border-b border-card-border px-4 py-3 last:border-b-0 hover:bg-card-bg/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-teal">
          {kindLabel(doc.docKind)}
        </span>
        {doc.internalCode && (
          <span className="font-mono text-[11px] text-muted">{doc.internalCode}</span>
        )}
        {doc.version && (
          <span className="text-[11px] text-muted">v{doc.version}</span>
        )}
        {doc.status && doc.status !== "active" && (
          <span className="rounded-md bg-card-bg px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
            {doc.status}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted">
          {doc.folderName ? `${doc.folderName} · ` : ""}
          {updated && `updated ${updated}`}
        </span>
      </div>

      <p className="mt-1 text-sm font-medium text-foreground">{doc.title}</p>

      {doc.snippet && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
          {renderSnippet(doc.snippet)}
        </p>
      )}
    </Link>
  );
}
