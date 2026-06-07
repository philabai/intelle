"use client";

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import type { StaleCitation } from "@/lib/regwatch/internal-document-citations";

interface Props {
  stale: StaleCitation[];
}

/**
 * Per-doc citation review queue. Lives at the top of the review panel
 * — auditors expect a one-glance answer to "are any cited clauses out
 * of date relative to the live regulation?". Sourced from
 * `findStaleCitations(body_doc)` which walks the inline `citedClause`
 * nodes and compares each `pinnedVersion` against the regulation's
 * current `last_changed_at`.
 */
export function CitationReviewQueue({ stale }: Props) {
  if (stale.length === 0) {
    return (
      <div className="rounded-md border border-card-border bg-background/40 p-3 text-[11px] text-muted">
        <span className="text-brand-teal">✓</span> All cited clauses are
        pinned to the latest regulation version on file.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-amber-300">
        Citation review queue · {stale.length} stale
      </p>
      <p className="mb-3 text-[11px] text-muted">
        The source regulation has changed since these clauses were cited.
        Re-open the compose workspace to refresh the pin or update the
        surrounding text.
      </p>
      <ul className="space-y-2">
        {stale.map((s) => (
          <li
            key={`${s.regId}::${s.clauseAnchor}`}
            className="rounded-md border border-amber-500/30 bg-background/40 p-2"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs text-foreground">
                <span className="font-medium">{s.displayText}</span>
              </p>
              {s.regulationCitation ? (
                <Link
                  href={`/regwatch/r/${s.jurisdictionCode?.toLowerCase() ?? "us"}/${s.regId}`}
                  className="text-[10px] text-brand-blue hover:underline"
                >
                  {s.jurisdictionCode} {s.regulationCitation} →
                </Link>
              ) : (
                <span className="text-[10px] text-red-300">
                  regulation deleted
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-muted">
              {s.pinnedVersion ? (
                <>
                  Pinned to{" "}
                  <span title={new Date(s.pinnedVersion).toLocaleString()}>
                    {formatDistanceToNowStrict(new Date(s.pinnedVersion), {
                      addSuffix: true,
                    })}
                  </span>
                </>
              ) : (
                <>Never pinned</>
              )}
              {s.currentVersion && (
                <>
                  {" · Current: "}
                  <span
                    className="text-amber-300"
                    title={new Date(s.currentVersion).toLocaleString()}
                  >
                    {formatDistanceToNowStrict(new Date(s.currentVersion), {
                      addSuffix: true,
                    })}
                  </span>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
