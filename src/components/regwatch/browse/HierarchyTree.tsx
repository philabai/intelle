"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SectionNode } from "@/lib/regwatch/regulatory-sections";

interface Props {
  roots: SectionNode[];
  jurisdictionCode: string;
}

/**
 * Recursive collapsible tree for the eCFR-style browse view. Every
 * node shows level chip + identifier + title + child count + an
 * "Updated 30d" amber marker when has_updates_30d is true. Leaves
 * with regulatory_item_id link to the regulation detail page.
 *
 * State is intentionally local — the URL doesn't track which nodes
 * are open (would explode for 12k-node titles). Deep linking still
 * works because every leaf is a hyperlink to the detail page.
 */
export function HierarchyTree({ roots, jurisdictionCode }: Props) {
  const [updatesOnly, setUpdatesOnly] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(
    // Top-level (Title-level) nodes start expanded so the page shows
    // structure on first load.
    () => new Set(roots.map((r) => r.id)),
  );

  const filtered = useMemo(() => {
    if (!updatesOnly) return roots;
    return roots
      .map((r) => pruneToUpdates(r))
      .filter((r): r is SectionNode => Boolean(r));
  }, [roots, updatesOnly]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Click any row to expand. Amber dot indicates recent updates.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-foreground/90">
          <input
            type="checkbox"
            checked={updatesOnly}
            onChange={(e) => setUpdatesOnly(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-brand-blue"
          />
          Show only sections with recent updates
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-xs text-muted">
          {updatesOnly
            ? "No sections in this jurisdiction have updates in the last 30 days."
            : "No hierarchy has been ingested for this jurisdiction yet. Run /api/cron/regwatch-hierarchy."}
        </div>
      ) : (
        <ul className="space-y-1">
          {filtered.map((root) => (
            <TreeRow
              key={root.id}
              node={root}
              depth={0}
              jurisdictionCode={jurisdictionCode}
              openIds={openIds}
              onToggle={toggle}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface RowProps {
  node: SectionNode;
  depth: number;
  jurisdictionCode: string;
  openIds: Set<string>;
  onToggle: (id: string) => void;
}

function TreeRow({ node, depth, jurisdictionCode, openIds, onToggle }: RowProps) {
  const open = openIds.has(node.id);
  const hasChildren = node.children.length > 0;
  // Three ways a row resolves:
  //  - INTERNAL: the node maps to an in-app regulation (a resolved item id, or
  //    a citation whose slug matches the item's slug). Linked even if it also
  //    has children — e.g. a CFR Part is both expandable and a regulation.
  //  - SECTION: a childless node with no item (e.g. an eCFR section) opens the
  //    in-app section page (short summary + a deep-link out to the publisher).
  //  - GROUP: a structural node (Chapter/Subpart/…) just toggles.
  const internalTarget = node.citation ?? node.regulatoryItemId;
  const isInternal = !!(node.regulatoryItemId || node.citation);
  const isSectionLeaf = !isInternal && !hasChildren;
  const indent = depth * 16;

  const headerInner = (
    <div className="flex flex-1 items-baseline gap-2 truncate">
      <span className="rounded border border-card-border bg-card-bg/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted">
        {node.levelLabel}
      </span>
      <span className="font-mono text-[11px] font-medium text-foreground">
        {node.identifier}
      </span>
      {node.title && (
        <span className="truncate text-[11px] text-foreground/80">
          {node.title}
        </span>
      )}
      {node.childCount > 0 && (
        <span className="text-[10px] text-muted">· {node.childCount} children</span>
      )}
    </div>
  );

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1 hover:border-card-border hover:bg-card-bg/40"
        style={{ paddingLeft: indent + 8 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="w-3 shrink-0 text-[10px] text-muted hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-3 shrink-0" aria-hidden />
        )}

        {isInternal && internalTarget ? (
          <Link
            href={`/regwatch/r/${jurisdictionCode.toLowerCase()}/${slugFromCitation(internalTarget)}`}
            className="flex-1 truncate"
          >
            {headerInner}
          </Link>
        ) : isSectionLeaf ? (
          <Link href={`/regwatch/section/${node.id}`} className="flex-1 truncate">
            {headerInner}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => hasChildren && onToggle(node.id)}
            className="flex-1 truncate text-left"
          >
            {headerInner}
          </button>
        )}

        <span
          className={`shrink-0 text-[10px] ${node.hasUpdates30d ? "text-amber-300" : "text-muted/40"}`}
          title={
            node.hasUpdates30d
              ? `Updated within the last 30 days${node.lastChangedAt ? ` (last change ${new Date(node.lastChangedAt).toLocaleDateString()})` : ""}`
              : "No updates in the last 30 days"
          }
        >
          ◉
        </span>
      </div>

      {open && hasChildren && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              jurisdictionCode={jurisdictionCode}
              openIds={openIds}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Returns a copy of `node` containing only subtrees that lead to an
 * updated leaf. Used when "Show only updates" is on.
 */
function pruneToUpdates(node: SectionNode): SectionNode | null {
  const prunedChildren = node.children
    .map((c) => pruneToUpdates(c))
    .filter((c): c is SectionNode => Boolean(c));
  if (prunedChildren.length === 0 && !node.hasUpdates30d) return null;
  return { ...node, children: prunedChildren };
}

function slugFromCitation(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
