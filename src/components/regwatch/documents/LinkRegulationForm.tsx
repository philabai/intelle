"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  linkDocumentToRegulation,
  unlinkDocumentFromRegulation,
} from "@/lib/regwatch/internal-documents-actions";
import { RegulationPicker } from "@/components/regwatch/RegulationPicker";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";

interface ExistingLink {
  id: string;
  regulatoryItemId: string;
  regulationCitation: string;
  regulationTitle: string;
  jurisdictionCode: string;
  clauseAnchor: string | null;
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
  const [clauseAnchor, setClauseAnchor] = useState("");
  const [clauseText, setClauseText] = useState("");
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
      // If the user picked a clause from the viewer but didn't write
      // their own rationale, fold the clause text into the rationale so
      // the link record carries the evidence text.
      const effectiveRationale =
        rationale.trim().length > 0
          ? rationale.trim()
          : clauseText.trim().length > 0
            ? clauseText.trim()
            : null;
      const res = await linkDocumentToRegulation({
        internalDocumentId: documentId,
        regulatoryItemId: picked.id,
        clauseAnchor: clauseAnchor.trim() || null,
        linkRationale: effectiveRationale,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not link");
        return;
      }
      setPicked(null);
      setClauseAnchor("");
      setClauseText("");
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

  const active = existingLinks.filter((l) => !l.supersededAt);

  return (
    <div className="space-y-4">
      {active.length > 0 ? (
        <ul className="space-y-2">
          {active.map((l) => (
            <li
              key={l.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-card-border bg-card-bg/40 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-mono text-[10px] text-muted">
                    {l.jurisdictionCode}
                  </span>{" "}
                  <span className="font-mono">{l.regulationCitation}</span>
                  {l.clauseAnchor && (
                    <span className="ml-1 text-xs text-muted">
                      · clause {l.clauseAnchor}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">{l.regulationTitle}</p>
                {l.linkRationale && (
                  <p className="mt-1 text-[11px] text-muted">{l.linkRationale}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onUnlink(l.id)}
                disabled={pending}
                className="rounded-md border border-red-500/40 px-2 py-1 text-[10px] text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
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
        <RegulationPicker
          value={picked}
          onChange={setPicked}
          clauseAnchor={clauseAnchor}
          onClauseAnchorChange={setClauseAnchor}
          clauseText={clauseText}
          onClauseTextChange={setClauseText}
          showClauseField
        />
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this doc linked? (optional)"
          rows={2}
          className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !picked}
            className="ml-auto rounded-md bg-brand-blue px-3 py-1.5 text-xs text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? "Linking…" : "Link"}
          </button>
        </div>
      </form>
    </div>
  );
}
