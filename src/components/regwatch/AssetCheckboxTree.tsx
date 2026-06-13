"use client";

import { useMemo, useState } from "react";

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
  /** Currently-selected asset ids. */
  value: string[];
  onChange: (next: string[]) => void;
  /** When provided, hides unselected leaves whose names don't match. */
  search?: string;
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

function descendantIds(n: TreeNode): string[] {
  const out: string[] = [n.id];
  for (const c of n.children) out.push(...descendantIds(c));
  return out;
}

/**
 * Multi-select tri-state asset tree.
 *
 * - Click a leaf to add/remove it from selection.
 * - Click a non-leaf to toggle ALL descendants in/out of selection.
 * - Parents render as "partial" when some-but-not-all descendants are
 *   selected; clicking a partial parent SELECTS all descendants.
 *
 * Used by the document → assets linker and (in Phase 4) the bulk
 * "attach regulation to many assets" affordance.
 */
export function AssetCheckboxTree({
  flat,
  levelLabels,
  value,
  onChange,
  search = "",
}: Props) {
  const tree = useMemo(() => buildTree(flat), [flat]);
  const selected = useMemo(() => new Set(value), [value]);
  const needle = search.trim().toLowerCase();

  function toggle(node: TreeNode) {
    const ids = descendantIds(node);
    const allSelected = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    onChange(Array.from(next));
  }

  return (
    <div className="rounded-lg border border-card-border bg-card-bg/40 p-2">
      <ul className="space-y-0.5">
        {tree.map((n) => (
          <CheckRow
            key={n.id}
            node={n}
            levelLabels={levelLabels}
            selected={selected}
            onToggle={toggle}
            needle={needle}
          />
        ))}
      </ul>
    </div>
  );
}

function matches(node: TreeNode, needle: string): boolean {
  if (!needle) return true;
  if (node.name.toLowerCase().includes(needle)) return true;
  if ((node.code ?? "").toLowerCase().includes(needle)) return true;
  return node.children.some((c) => matches(c, needle));
}

function CheckRow({
  node,
  levelLabels,
  selected,
  onToggle,
  needle,
}: {
  node: TreeNode;
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  selected: Set<string>;
  onToggle: (n: TreeNode) => void;
  needle: string;
}) {
  const [open, setOpen] = useState(node.level <= 3);
  // Hooks must run unconditionally — compute before the visibility early-return.
  const descendants = useMemo(() => descendantIds(node), [node]);
  if (!matches(node, needle)) return null;
  const allSelected = descendants.every((id) => selected.has(id));
  const someSelected = descendants.some((id) => selected.has(id));
  const tristate: "checked" | "partial" | "empty" = allSelected
    ? "checked"
    : someSelected
      ? "partial"
      : "empty";

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-brand-navy/30"
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
          onClick={() => onToggle(node)}
          className="flex flex-1 items-center gap-2 text-start"
        >
          <CheckBox state={tristate} />
          <span className="font-medium text-foreground">{node.name}</span>
          {node.code && (
            <span className="font-mono text-[10px] text-muted">{node.code}</span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {levelLabels[node.level]}
          </span>
          {tristate === "partial" && (
            <span className="ms-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">
              partial
            </span>
          )}
        </button>
      </div>
      {open && node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <CheckRow
              key={c.id}
              node={c}
              levelLabels={levelLabels}
              selected={selected}
              onToggle={onToggle}
              needle={needle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function CheckBox({ state }: { state: "checked" | "partial" | "empty" }) {
  if (state === "checked") {
    return (
      <span
        aria-hidden
        className="grid h-4 w-4 place-items-center rounded border border-brand-teal bg-brand-teal text-[10px] text-background"
      >
        ✓
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span
        aria-hidden
        className="grid h-4 w-4 place-items-center rounded border border-brand-teal bg-brand-teal/30"
      >
        <span className="inline-block h-0.5 w-2 bg-foreground" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 rounded border border-card-border bg-card-bg"
    />
  );
}
