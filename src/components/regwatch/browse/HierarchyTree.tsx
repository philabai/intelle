"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SectionNode } from "@/lib/regwatch/regulatory-sections";
import { loadSectionChildren } from "@/lib/regwatch/section-children-actions";

interface Props {
  roots: SectionNode[];
  jurisdictionCode: string;
}

/**
 * Collapsible eCFR-style browse tree with lazy expansion.
 *
 * The server sends only the shallow tree (down to Part level). A node whose
 * `childCount > 0` but has no loaded children renders an expand arrow and
 * fetches its children via the loadSectionChildren server action the first
 * time it's opened. This keeps the initial payload tiny — a full CFR
 * jurisdiction is ~23k section nodes, but only ~hundreds down to Part level.
 *
 * State is local: open set, a map of lazily-loaded children, and an in-flight
 * set for spinners. Deep links still work because every leaf is a hyperlink.
 */
export function HierarchyTree({ roots, jurisdictionCode }: Props) {
  const t = useTranslations("regwatch.discover");
  const [updatesOnly, setUpdatesOnly] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(roots.map((r) => r.id)),
  );
  const [loaded, setLoaded] = useState<Map<string, SectionNode[]>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const getChildren = useCallback(
    (node: SectionNode): SectionNode[] =>
      node.children.length > 0 ? node.children : loaded.get(node.id) ?? [],
    [loaded],
  );

  const toggle = useCallback(
    async (node: SectionNode) => {
      if (openIds.has(node.id)) {
        setOpenIds((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
        return;
      }
      // Opening — lazy-load children the first time if the shallow tree didn't
      // include them.
      const needLoad =
        node.children.length === 0 &&
        node.childCount > 0 &&
        !loaded.has(node.id);
      if (needLoad) {
        setLoadingIds((prev) => new Set(prev).add(node.id));
        try {
          const kids = await loadSectionChildren(node.id);
          setLoaded((prev) => new Map(prev).set(node.id, kids));
        } catch {
          // leave unloaded; arrow stays so the user can retry
        } finally {
          setLoadingIds((prev) => {
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
        }
      }
      setOpenIds((prev) => new Set(prev).add(node.id));
    },
    [openIds, loaded],
  );

  const filtered = useMemo(() => {
    if (!updatesOnly) return roots;
    return roots
      .map((r) => pruneToUpdates(r))
      .filter((r): r is SectionNode => Boolean(r));
  }, [roots, updatesOnly]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          {t("treeIntro")}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-foreground/90">
          <input
            type="checkbox"
            checked={updatesOnly}
            onChange={(e) => setUpdatesOnly(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-brand-blue"
          />
          {t("treeUpdatesOnly")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-xs text-muted">
          {updatesOnly
            ? t("treeEmptyUpdates")
            : t("treeEmptyNoHierarchy")}
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
              loadingIds={loadingIds}
              getChildren={getChildren}
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
  loadingIds: Set<string>;
  getChildren: (node: SectionNode) => SectionNode[];
  onToggle: (node: SectionNode) => void;
}

function TreeRow({
  node,
  depth,
  jurisdictionCode,
  openIds,
  loadingIds,
  getChildren,
  onToggle,
}: RowProps) {
  const t = useTranslations("regwatch.discover");
  const open = openIds.has(node.id);
  const loading = loadingIds.has(node.id);
  // childCount is denormalised, so a Part shows an expand arrow even before its
  // sections are lazy-loaded.
  const hasChildren = node.childCount > 0 || node.children.length > 0;
  // Three ways a row resolves:
  //  - INTERNAL: maps to an in-app regulation (resolved item id, or a citation
  //    whose slug matches the item). Linked even if also expandable (a Part).
  //  - SECTION: a childless node with no item (an eCFR section) opens the
  //    in-app section page (summary + deep-link out).
  //  - GROUP: a structural node (Chapter/Subpart/…) just toggles.
  const internalTarget = node.citation ?? node.regulatoryItemId;
  const isInternal = !!(node.regulatoryItemId || node.citation);
  const isSectionLeaf = !isInternal && !hasChildren;
  const indent = depth * 16;
  const children = open ? getChildren(node) : [];

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
        <span className="text-[10px] text-muted">
          {t("childrenCount", { count: node.childCount })}
        </span>
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
            onClick={() => onToggle(node)}
            className="w-3 shrink-0 text-[10px] text-muted hover:text-foreground"
            aria-label={open ? t("collapse") : t("expand")}
          >
            {loading ? "◌" : open ? "▾" : "▸"}
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
            onClick={() => hasChildren && onToggle(node)}
            className="flex-1 truncate text-start"
          >
            {headerInner}
          </button>
        )}

        <span
          className={`shrink-0 text-[10px] ${node.hasUpdates30d ? "text-amber-300" : "text-muted/40"}`}
          title={
            node.hasUpdates30d
              ? node.lastChangedAt
                ? t("treeUpdatedWithLastChange", {
                    date: new Date(node.lastChangedAt).toLocaleDateString(),
                  })
                : t("treeUpdatedRecently")
              : t("treeNoUpdates")
          }
        >
          ◉
        </span>
      </div>

      {open && (
        <ul className="space-y-0.5">
          {loading && children.length === 0 ? (
            <li
              className="px-2 py-1 text-[11px] text-muted"
              style={{ paddingLeft: (depth + 1) * 16 + 8 }}
            >
              {t("loading")}
            </li>
          ) : (
            children.map((c) => (
              <TreeRow
                key={c.id}
                node={c}
                depth={depth + 1}
                jurisdictionCode={jurisdictionCode}
                openIds={openIds}
                loadingIds={loadingIds}
                getChildren={getChildren}
                onToggle={onToggle}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Returns a copy of `node` containing only subtrees that lead to an updated
 * leaf. Operates on the shallow tree using the rolled-up has_updates_30d flag,
 * so it stays correct even though sections aren't loaded yet.
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
