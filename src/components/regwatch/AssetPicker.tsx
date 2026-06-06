"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface PickerNode {
  id: string;
  parentId: string | null;
  level: 2 | 3 | 4 | 5 | 6;
  name: string;
  code: string | null;
}

interface Props {
  flat: PickerNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  value: string | null;
  onChange: (assetId: string | null) => void;
}

interface TreeNode extends PickerNode {
  children: TreeNode[];
}

function buildTree(flat: PickerNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const r of flat) byId.set(r.id, { ...r, children: [] });
  const roots: TreeNode[] = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    n.children.forEach(sort);
  };
  roots.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  roots.forEach(sort);
  return roots;
}

function filterTree(roots: TreeNode[], q: string): TreeNode[] {
  if (!q.trim()) return roots;
  const needle = q.toLowerCase();
  const matches = (n: TreeNode): TreeNode | null => {
    const childMatches = n.children
      .map(matches)
      .filter((x): x is TreeNode => x !== null);
    const selfMatches =
      n.name.toLowerCase().includes(needle) ||
      (n.code ?? "").toLowerCase().includes(needle);
    if (selfMatches || childMatches.length > 0) {
      return { ...n, children: childMatches };
    }
    return null;
  };
  return roots
    .map(matches)
    .filter((x): x is TreeNode => x !== null);
}

/**
 * Single-select tree-select for picking one asset. Open as a popover from
 * a chip-style trigger. Click any node (any level) to select it — the
 * obligation pinned at L3 (Area) applies to every L4/L5 underneath via
 * hierarchical inheritance the dashboard surfaces.
 */
export function AssetPicker({ flat, levelLabels, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const flatById = useMemo(() => {
    const m = new Map<string, PickerNode>();
    for (const n of flat) m.set(n.id, n);
    return m;
  }, [flat]);

  const filteredRoots = useMemo(() => {
    const tree = buildTree(flat);
    return filterTree(tree, query);
  }, [flat, query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const picked = value ? flatById.get(value) ?? null : null;

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-card-border bg-card-bg px-3 py-2 text-left text-sm text-foreground hover:border-brand-blue"
      >
        {picked ? (
          <span className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {levelLabels[picked.level]}
            </span>
            <span>{picked.name}</span>
            {picked.code && (
              <span className="font-mono text-[10px] text-muted">{picked.code}</span>
            )}
          </span>
        ) : (
          <span className="text-muted">Pick an asset…</span>
        )}
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-96 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-lg">
          <div className="border-b border-card-border p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or code…"
              autoFocus
              className="w-full rounded-md border border-card-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="max-h-72 overflow-auto px-1 py-2">
            {filteredRoots.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted">
                No assets match. Add one at{" "}
                <span className="font-mono">/regwatch/assets/setup</span>.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filteredRoots.map((n) => (
                  <PickerRow
                    key={n.id}
                    node={n}
                    levelLabels={levelLabels}
                    onPick={pick}
                    selectedId={value}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PickerRow({
  node,
  levelLabels,
  onPick,
  selectedId,
}: {
  node: TreeNode;
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  onPick: (id: string) => void;
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(node.level <= 3);
  const isSelected = selectedId === node.id;
  return (
    <li>
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs transition ${
          isSelected ? "bg-brand-teal/15" : "hover:bg-brand-navy/30"
        }`}
        style={{ paddingLeft: `${(node.level - 2) * 12 + 4}px` }}
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
          <span className="inline-block h-4 w-4" />
        )}
        <button
          type="button"
          onClick={() => onPick(node.id)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className={`font-medium ${isSelected ? "text-brand-teal" : ""}`}>
            {node.name}
          </span>
          {node.code && (
            <span className="font-mono text-[10px] text-muted">{node.code}</span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {levelLabels[node.level]}
          </span>
        </button>
      </div>
      {open && node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <PickerRow
              key={c.id}
              node={c}
              levelLabels={levelLabels}
              onPick={onPick}
              selectedId={selectedId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
