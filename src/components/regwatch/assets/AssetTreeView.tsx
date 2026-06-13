"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { AssetTreeNode, AssetTrafficLight } from "@/lib/regwatch/assets";
import { AssetComplianceDrawer } from "./AssetComplianceDrawer";

interface Props {
  roots: AssetTreeNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  /** When true, each node row links to /regwatch/assets/[id]. */
  linkable?: boolean;
  /** When set, nodes display a count badge from the parent. */
  obligationCountByAssetId?: Record<string, number>;
  /** When set, nodes show a glowing compliance traffic-light (rolled up). */
  complianceLightByAssetId?: Record<string, AssetTrafficLight>;
  /**
   * When true, clicking a node opens a right-side slider with that asset's
   * compliance obligations (instead of navigating to the asset page).
   */
  complianceDrawer?: boolean;
}

const LEVEL_ACCENT: Record<number, string> = {
  2: "text-brand-teal",
  3: "text-brand-blue",
  4: "text-brand-violet",
  5: "text-foreground",
  6: "text-muted",
};

/** Glowing dot styles per traffic-light state. Red/amber pulse for attention. */
const LIGHT_STYLE: Record<AssetTrafficLight, string> = {
  red: "bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.75)] animate-pulse",
  amber: "bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.7)] animate-pulse",
  green: "bg-emerald-400 shadow-[0_0_7px_2px_rgba(52,211,153,0.6)]",
};

const LIGHT_TITLE: Record<AssetTrafficLight, string> = {
  red: "Open compliance item — non-compliant or critical",
  amber: "Open compliance item — in progress",
  green: "All compliance items addressed",
};

export function AssetTreeView({
  roots,
  levelLabels,
  linkable = false,
  obligationCountByAssetId,
  complianceLightByAssetId,
  complianceDrawer = false,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    <>
      <ul className="space-y-1">
        {roots.map((n) => (
          <AssetRow
            key={n.id}
            node={n}
            levelLabels={levelLabels}
            linkable={linkable}
            obligationCountByAssetId={obligationCountByAssetId}
            complianceLightByAssetId={complianceLightByAssetId}
            onSelect={complianceDrawer ? setSelectedId : undefined}
          />
        ))}
      </ul>
      {complianceDrawer && (
        <AssetComplianceDrawer
          assetId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

function AssetRow({
  node,
  levelLabels,
  linkable,
  obligationCountByAssetId,
  complianceLightByAssetId,
  onSelect,
}: {
  node: AssetTreeNode;
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  linkable: boolean;
  obligationCountByAssetId?: Record<string, number>;
  complianceLightByAssetId?: Record<string, AssetTrafficLight>;
  onSelect?: (assetId: string) => void;
}) {
  const [open, setOpen] = useState(node.level <= 3);
  const accent = LEVEL_ACCENT[node.level] ?? "text-foreground";
  const obligations = obligationCountByAssetId?.[node.id] ?? 0;
  const light = complianceLightByAssetId?.[node.id];
  const levelLabel = levelLabels[node.level as 2 | 3 | 4 | 5 | 6];
  const labelEl = (
    <>
      {light && (
        <span
          className={`me-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${LIGHT_STYLE[light]}`}
          title={LIGHT_TITLE[light]}
          aria-label={LIGHT_TITLE[light]}
          role="img"
        />
      )}
      <span className={`font-medium ${accent}`}>{node.name}</span>
      {node.code && (
        <span className="ms-2 font-mono text-[10px] text-muted">
          {node.code}
        </span>
      )}
      <span className="ms-2 text-[10px] uppercase tracking-wider text-muted">
        {levelLabel}
      </span>
      {obligations > 0 && (
        <span className="ms-2 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
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
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className="flex items-center gap-1 text-start hover:underline"
          >
            {labelEl}
          </button>
        ) : linkable ? (
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
              complianceLightByAssetId={complianceLightByAssetId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
