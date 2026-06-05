"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  linkDocumentToRegulation,
  unlinkDocumentFromRegulation,
} from "@/lib/regwatch/internal-documents-actions";

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
  const [regulatoryItemId, setRegulatoryItemId] = useState("");
  const [clauseAnchor, setClauseAnchor] = useState("");
  const [rationale, setRationale] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await linkDocumentToRegulation({
        internalDocumentId: documentId,
        regulatoryItemId: regulatoryItemId.trim(),
        clauseAnchor: clauseAnchor.trim() || null,
        linkRationale: rationale.trim() || null,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not link");
        return;
      }
      setRegulatoryItemId("");
      setClauseAnchor("");
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
        className="rounded-lg border border-card-border bg-card-bg/40 p-3"
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Link a regulation
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={regulatoryItemId}
            onChange={(e) => setRegulatoryItemId(e.target.value)}
            placeholder="Regulation UUID"
            className="rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none sm:col-span-2"
            required
          />
          <input
            value={clauseAnchor}
            onChange={(e) => setClauseAnchor(e.target.value)}
            placeholder="Clause (optional)"
            className="rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
          />
        </div>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this doc linked? (optional)"
          rows={2}
          className="mt-2 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending || !regulatoryItemId.trim()}
            className="ml-auto rounded-md bg-brand-blue px-3 py-1.5 text-xs text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {pending ? "Linking…" : "Link"}
          </button>
        </div>
      </form>
      <p className="text-[10px] text-muted">
        UUID look-up will become a search picker in the next slice — for now,
        paste the regulation&apos;s id from its detail page URL.
      </p>
    </div>
  );
}
