"use client";

import { useState } from "react";
import { Modal } from "@/components/regwatch/Modal";

export interface MappedRow {
  id: string;
  regulationCitation: string;
  regulationTitle: string;
  jurisdictionCode: string;
  clauseAnchor: string | null;
  internalClauseAnchor: string | null;
  linkRationale: string | null;
  /**
   * Sequential pair number across the current regulation context — the
   * same number appears on the matched clause on the other pane, making
   * the pairing visually obvious. Undefined when no regulation context
   * is active (e.g., when viewing the section side before a regulation
   * is picked).
   */
  matchNumber?: number;
}

interface Props {
  count: number;
  rows: MappedRow[];
  side: "internal" | "regulation";
}

/**
 * Mapped-already indicator. Two modes:
 *
 *  - **Numbered chips** (when each row has a matchNumber): renders one
 *    small circular [N] chip per mapping. The same N appears on the
 *    paired clause on the other pane so the user can see at a glance
 *    which section maps to which clause.
 *  - **Count badge** (fallback): "✓ N mapped" pill, used when there's
 *    no regulation context to anchor the pairing.
 *
 * Either form opens a modal with the full mapping details on click.
 */
export function MappedBadge({ count, rows, side }: Props) {
  const [open, setOpen] = useState(false);
  if (count <= 0) return null;
  const numbered = rows.every((r) => typeof r.matchNumber === "number");
  return (
    <>
      {numbered ? (
        <span className="inline-flex items-center gap-1">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              title={`Pair #${r.matchNumber} — click to see details`}
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-brand-teal/60 bg-brand-teal/15 px-1 text-[10px] font-semibold tabular-nums text-brand-teal hover:border-brand-teal hover:bg-brand-teal/25"
            >
              {r.matchNumber}
            </button>
          ))}
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title={`Already mapped to ${count} ${count === 1 ? "row" : "rows"} — click to see them`}
          className="rounded-full border border-brand-teal/50 bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-teal hover:border-brand-teal hover:bg-brand-teal/20"
        >
          ✓ {count} mapped
        </button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          side === "internal"
            ? "Mappings from this section"
            : "Mappings to this clause"
        }
        size="lg"
      >
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-card-border bg-card-bg/30 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-1">
                {typeof r.matchNumber === "number" && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-brand-teal/60 bg-brand-teal/15 px-1 text-[10px] font-semibold tabular-nums text-brand-teal">
                    {r.matchNumber}
                  </span>
                )}
                <span className="rounded bg-brand-navy/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  {r.jurisdictionCode}
                </span>
                <span className="font-mono text-foreground">
                  {r.regulationCitation}
                </span>
                {r.clauseAnchor && (
                  <>
                    <span className="text-muted">·</span>
                    <span className="font-medium text-foreground">
                      {r.clauseAnchor}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted">
                {r.regulationTitle}
              </p>
              {r.internalClauseAnchor && (
                <p className="mt-1 text-[11px]">
                  <span className="text-muted">Your section: </span>
                  <span className="font-medium text-foreground">
                    {r.internalClauseAnchor}
                  </span>
                </p>
              )}
              {r.linkRationale && (
                <p className="mt-1 text-[11px] text-foreground/80">
                  {r.linkRationale}
                </p>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
