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
}

interface Props {
  count: number;
  rows: MappedRow[];
  side: "internal" | "regulation";
}

/**
 * Small teal badge that opens a modal listing the existing crosswalk rows
 * for a paragraph. Click → see what was already mapped where.
 */
export function MappedBadge({ count, rows, side }: Props) {
  const [open, setOpen] = useState(false);
  if (count <= 0) return null;
  return (
    <>
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
