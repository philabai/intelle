"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { unlinkDocumentFromRegulation } from "@/lib/regwatch/internal-documents-actions";

/**
 * Existing clause-level links table.
 *
 * Read-only view of the rows already in internal_document_regulation_links
 * with BOTH anchors set. Adding new rows happens exclusively in the
 * side-by-side workspace at /regwatch/documents/[id]/crosswalk so this
 * panel doesn't duplicate that flow.
 *
 * Row = "§4.2 of SOP-EHS-014" ↔ "Article 6(2) of CBAM" + rationale.
 */

interface ExistingLink {
  id: string;
  regulatoryItemId: string;
  regulationCitation: string;
  regulationTitle: string;
  jurisdictionCode: string;
  clauseAnchor: string | null;
  internalClauseAnchor: string | null;
  linkRationale: string | null;
  supersededAt: string | null;
}

interface Props {
  existingLinks: ExistingLink[];
}

export function ClauseCrosswalkPanel({ existingLinks }: Props) {
  const t = useTranslations("regwatch.documents");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onUnlink(linkId: string) {
    startTransition(async () => {
      const res = await unlinkDocumentFromRegulation({ linkId });
      if (!res.ok) return;
      router.refresh();
    });
  }

  const crosswalkRows = existingLinks.filter(
    (l) =>
      !l.supersededAt &&
      !!l.clauseAnchor?.trim() &&
      !!l.internalClauseAnchor?.trim(),
  );

  if (crosswalkRows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
        {t.rich("noClauseMappings", {
          strong: (chunks) => (
            <strong className="text-foreground">{chunks}</strong>
          ),
        })}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-card-border bg-background">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[36%]" />
          <col className="w-[30%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead className="border-b border-card-border bg-card-bg/40 text-start text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">{t("colYourSection")}</th>
            <th className="px-3 py-2">{t("regulationClause")}</th>
            <th className="px-3 py-2">{t("colRationaleEvidence")}</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {crosswalkRows.map((l) => (
            <tr
              key={l.id}
              className="border-b border-card-border last:border-0"
            >
              <td className="break-words px-3 py-2 align-top">
                <p className="text-xs font-medium text-foreground">
                  {l.internalClauseAnchor}
                </p>
              </td>
              <td className="break-words px-3 py-2 align-top">
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="rounded bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted">
                    {l.jurisdictionCode}
                  </span>
                  <span className="font-mono text-foreground">
                    {l.regulationCitation}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="font-medium text-foreground">
                    {l.clauseAnchor}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted">
                  {l.regulationTitle}
                </p>
              </td>
              <td className="break-words px-3 py-2 align-top text-[11px] text-foreground/85">
                {l.linkRationale ?? <span className="text-muted">—</span>}
              </td>
              <td className="px-3 py-2 text-end align-top">
                <button
                  type="button"
                  onClick={() => onUnlink(l.id)}
                  disabled={pending}
                  title={t("removeCrosswalkRowTitle")}
                  className="rounded-md border border-red-500/40 px-2 py-1 text-[10px] text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {t("remove")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
