"use client";

import { useState } from "react";
import Link from "next/link";
import type { AssetTreeNode } from "@/lib/regwatch/assets";

interface Props {
  roots: AssetTreeNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  /** When true, each node row links to /regwatch/assets/[id]. */
  linkable?: boolean;
  /** When set, nodes display a count badge from the parent. */
  obligationCountByAssetId?: Record<string, number>;
}

const LEVEL_ACCENT: Record<number, string> = {
  2: "text-brand-teal",
  3: "text-brand-blue",
  4: "text-brand-violet",
  5: "text-foreground",
  6: "text-muted",
};

export function AssetTreeView({
  roots,
  levelLabels,
  linkable = false,
  obligationCountByAssetId,
}: Props) {
  if (roots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-6 text-center text-sm text-muted">
        No assets configured yet. Use{" "}
        <Link
          href="/regwatch/assets/setup"
          className="text-brand-teal hover:underline"
        >
          Setup
        </Link>{" "}
        to add a Site or import a starter pack.
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {roots.map((n) => (
        <AssetRow
          key={n.id}
          node={n}
          levelLabels={levelLabels}
          linkable={linkable}
          obligationCountByAssetId={obligationCountByAssetId}
        />
      ))}
    </ul>
  );
}

function AssetRow({
  node,
  levelLabels,
  linkable,
  obligationCountByAssetId,
}: {
  node: AssetTreeNode;
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  linkable: boolean;
  obligationCountByAssetId?: Record<string, number>;
}) {
  const [open, setOpen] = useState(node.level <= 3);
  const accent = LEVEL_ACCENT[node.level] ?? "text-foreground";
  const obligations = obligationCountByAssetId?.[node.id] ?? 0;
  const levelLabel = levelLabels[node.level as 2 | 3 | 4 | 5 | 6];
  const labelEl = (
    <>
      <span className={`font-medium ${accent}`}>{node.name}</span>
      {node.code && (
        <span className="ml-2 font-mono text-[10px] text-muted">
          {node.code}
        </span>
      )}
      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted">
        {levelLabel}
      </span>
      {obligations > 0 && (
        <span className="ml-2 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
          {obligations}
        </span>
      )}
    </>
  );

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-card-bg"
        style={{ paddingLeft: `${(node.level - 2) * 14 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-4 w-4 place-items-center text-muted hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
            title={open ? "Collapse children" : "Expand children"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-block h-4 w-4" aria-hidden />
        )}
        {linkable ? (
          <Link
            href={`/regwatch/assets/${node.id}`}
            className="flex items-center gap-1 hover:underline"
          >
            {labelEl}
          </Link>
        ) : (
          <span className="flex items-center gap-1">{labelEl}</span>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((c) => (
            <AssetRow
              key={c.id}
              node={c}
              levelLabels={levelLabels}
              linkable={linkable}
              obligationCountByAssetId={obligationCountByAssetId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
