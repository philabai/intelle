"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  linkDocumentToRegulation,
  unlinkDocumentFromRegulation,
} from "@/lib/regwatch/internal-documents-actions";
import { RegulationPicker } from "@/components/regwatch/RegulationPicker";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";

/**
 * Clause crosswalk — the depth view.
 *
 * Borrows the table-of-mappings pattern from Veeva Vault QualityDocs,
 * Drata / Vanta / SecureFrame SOC2 crosswalks, and AuditBoard's
 * Requirement Traceability Matrix. Each row maps ONE section of THIS
 * document to ONE clause of an external regulation:
 *
 *   "§4.2 of SOP-EHS-014"  ↔  "Article 6(2) of CBAM"   + rationale
 *
 * Backed by the same internal_document_regulation_links table as the
 * doc-level panel; a row is treated as crosswalk when both
 * internal_clause_anchor AND clause_anchor are set. The partial unique
 * index keys on (org, doc, reg, coalesce(clause_anchor, '')) so multiple
 * crosswalk rows per regulation are fine as long as the regulation-side
 * anchors differ.
 *
 * The "View & pick clause" affordance in the regulation picker opens the
 * existing RegulationViewer drawer so reviewers can pick the right
 * regulation-side anchor from the actual text.
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
  documentId: string;
  existingLinks: ExistingLink[];
}

export function ClauseCrosswalkPanel({ documentId, existingLinks }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<RegulationPickerResult | null>(null);
  const [regulationAnchor, setRegulationAnchor] = useState("");
  const [clauseText, setClauseText] = useState("");
  const [internalAnchor, setInternalAnchor] = useState("");
  const [rationale, setRationale] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPicked(null);
    setRegulationAnchor("");
    setClauseText("");
    setInternalAnchor("");
    setRationale("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!picked) {
      setError("Pick a regulation first");
      return;
    }
    if (!internalAnchor.trim()) {
      setError("Type the section of YOUR document (e.g. §4.2)");
      return;
    }
    if (!regulationAnchor.trim()) {
      setError(
        "Type the clause of the regulation (e.g. Article 6(2)) or use 'View & pick clause' to capture one from the regulation text",
      );
      return;
    }
    startTransition(async () => {
      const effectiveRationale =
        rationale.trim().length > 0
          ? rationale.trim()
          : clauseText.trim().length > 0
            ? clauseText.trim()
            : null;
      const res = await linkDocumentToRegulation({
        internalDocumentId: documentId,
        regulatoryItemId: picked.id,
        clauseAnchor: regulationAnchor.trim(),
        internalClauseAnchor: internalAnchor.trim(),
        linkRationale: effectiveRationale,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save mapping");
        return;
      }
      reset();
      router.refresh();
    });
  }

  function onUnlink(linkId: string) {
    startTransition(async () => {
      const res = await unlinkDocumentFromRegulation({ linkId });
      if (!res.ok) {
        setError(res.error ?? "Could not remove mapping");
        return;
      }
      router.refresh();
    });
  }

  const crosswalkRows = existingLinks.filter(
    (l) =>
      !l.supersededAt &&
      !!l.clauseAnchor?.trim() &&
      !!l.internalClauseAnchor?.trim(),
  );

  return (
    <div className="space-y-4">
      {crosswalkRows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-card-border bg-background">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[36%]" />
              <col className="w-[30%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="border-b border-card-border bg-card-bg/40 text-left text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">Your document section</th>
                <th className="px-3 py-2">Regulation clause</th>
                <th className="px-3 py-2">Rationale / evidence</th>
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
                    {l.linkRationale ?? (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => onUnlink(l.id)}
                      disabled={pending}
                      title="Remove this crosswalk row"
                      className="rounded-md border border-red-500/40 px-2 py-1 text-[10px] text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
          No clause mappings yet. Add the first one below.
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-card-border bg-card-bg/40 p-3"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Add a clause mapping
        </p>
        <p className="text-[11px] text-muted">
          Map one section of <strong>your</strong> document to one clause of
          an external regulation. Use this when you need granular
          traceability — e.g. for SOC2, ISO, or pharma GxP audit-readiness.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span
              className="text-[10px] font-medium uppercase tracking-wider text-muted"
              title="The section / paragraph / step number INSIDE your uploaded document. Free text — type whatever your document uses to refer to it."
            >
              Your document section
            </span>
            <input
              value={internalAnchor}
              onChange={(e) => setInternalAnchor(e.target.value)}
              placeholder="e.g. §4.2, Step 7, Annex B"
              title="Example: §4.2, Step 7, Section 3, Annex B, Procedure P-12"
              className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          </label>
          <label className="block">
            <span
              className="text-[10px] font-medium uppercase tracking-wider text-muted"
              title="Use 'View & pick clause' in the regulation picker below to capture the regulation-side anchor + text directly from the source."
            >
              Regulation clause anchor
            </span>
            <input
              value={regulationAnchor}
              onChange={(e) => setRegulationAnchor(e.target.value)}
              placeholder="e.g. Article 6(2), §261.4(b)(7)"
              title="The matching clause of the external regulation. Picking from 'View & pick clause' below auto-fills this."
              className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          </label>
        </div>

        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Regulation
          </span>
          <div className="mt-1">
            <RegulationPicker
              value={picked}
              onChange={setPicked}
              clauseAnchor={regulationAnchor}
              onClauseAnchorChange={setRegulationAnchor}
              clauseText={clauseText}
              onClauseTextChange={setClauseText}
              showClauseField={false}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted">
            Pick the regulation here; use its &ldquo;📖 View &amp; pick
            clause&rdquo; button to open the regulation text and grab the
            clause anchor straight from it.
          </p>
        </div>

        <label className="block">
          <span
            className="text-[10px] font-medium uppercase tracking-wider text-muted"
            title="Why does your section satisfy / refer to the regulation clause? Auditors will read this."
          >
            Rationale / evidence (optional)
          </span>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Brief justification of how this section satisfies the clause. If left empty and you picked a clause via the viewer, the clause text is stored as fallback evidence."
            rows={3}
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !picked}
            title="Save this clause mapping"
            className="ml-auto rounded-md bg-brand-blue px-3 py-1.5 text-xs text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Add mapping"}
          </button>
        </div>
      </form>
    </div>
  );
}
