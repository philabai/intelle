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
 * Document-level "Linked regulations" panel — the breadth view.
 *
 * Adds one row per (doc, reg) saying "this internal document is in scope of
 * this regulation." NO clause picker here — clause-to-clause mappings live
 * in <ClauseCrosswalkPanel> so the two flows don't bleed into each other.
 *
 * Layout: rows use `min-w-0` + `truncate` so a long regulation title can't
 * horizontally overflow the page (which it did before this rewrite).
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

export function LinkRegulationForm({ documentId, existingLinks }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<RegulationPickerResult | null>(null);
  const [rationale, setRationale] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!picked) {
      setError("Pick a regulation first");
      return;
    }
    startTransition(async () => {
      const res = await linkDocumentToRegulation({
        internalDocumentId: documentId,
        regulatoryItemId: picked.id,
        clauseAnchor: null,
        internalClauseAnchor: null,
        linkRationale: rationale.trim() || null,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not link");
        return;
      }
      setPicked(null);
      setRationale("");
      router.refresh();
    });
  }

  function onUnlink(linkId: string) {
    startTransition(async () => {
      const res = await unlinkDocumentFromRegulation({ linkId });
      if (!res.ok) {
        setError(res.error ?? "Could not unlink");
        return;
      }
      router.refresh();
    });
  }

  // Doc-level links = both anchors empty. Crosswalk rows show in the other
  // panel; supersededAt rows show in neither (history-only).
  const docLevel = existingLinks.filter(
    (l) =>
      !l.supersededAt &&
      !(l.clauseAnchor?.trim() && l.internalClauseAnchor?.trim()),
  );

  return (
    <div className="space-y-4">
      {docLevel.length > 0 ? (
        <ul className="space-y-2">
          {docLevel.map((l) => (
            <li
              key={l.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-card-border bg-card-bg/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="rounded bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted">
                    {l.jurisdictionCode}
                  </span>
                  <span className="truncate font-mono text-foreground">
                    {l.regulationCitation}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 break-words text-sm text-foreground">
                  {l.regulationTitle}
                </p>
                {l.linkRationale && (
                  <p className="mt-1 line-clamp-3 break-words text-[11px] text-muted">
                    {l.linkRationale}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onUnlink(l.id)}
                disabled={pending}
                title="Remove this regulation link (history is preserved)"
                className="shrink-0 rounded-md border border-red-500/40 px-2 py-1 text-[10px] text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
          No regulations linked yet.
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-lg border border-card-border bg-card-bg/40 p-3"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Link a regulation
        </p>
        <p className="text-[11px] text-muted">
          Pin this document to a regulation as a whole — &ldquo;this document
          is in scope of this regulation&rdquo;. For mapping specific
          sections of your document to specific clauses of the regulation,
          use the <strong>Clause crosswalk</strong> panel below.
        </p>
        {/* No clause picker here — RegulationPicker without showClauseField
            simplifies the flow to "just pick a regulation". */}
        <RegulationPicker
          value={picked}
          onChange={setPicked}
          showClauseField={false}
        />
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this doc linked? (optional — e.g. 'covers all flare-stack obligations')"
          rows={2}
          className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !picked}
            title="Save this whole-regulation link"
            className="ml-auto rounded-md bg-brand-blue px-3 py-1.5 text-xs text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? "Linking…" : "Link"}
          </button>
        </div>
      </form>
    </div>
  );
}
