"use client";

import { useState } from "react";
import type { DocumentFolderTreeNode } from "@/lib/regwatch/document-folders";

/** Sentinel value (in the selection list) for the "Unfiled" pseudo-folder. */
export const UNFILED_TOKEN = "unfiled";

/**
 * Folder tree with a checkbox per folder, used to scope the Company Docs search.
 * Controlled: `selected` is the list of ticked folder ids (may include
 * UNFILED_TOKEN). Ticking a folder scopes to it + its sub-folders (descendants
 * are expanded at query time). No folder ticked = all company documents.
 */
export function FolderPicker({
  tree,
  unfiledCount,
  selected,
  onChange,
}: {
  tree: DocumentFolderTreeNode[];
  unfiledCount: number;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const sel = new Set(selected);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  const empty = tree.length === 0 && unfiledCount === 0;

  return (
    <div className="rounded-lg border border-card-border bg-background/40 p-2">
      <p className="px-1 pb-1.5 text-[11px] text-muted">
        {empty
          ? "No company documents yet."
          : "Pick folders to search (includes sub-folders). None selected = all company documents."}
      </p>
      {!empty && (
        <ul className="max-h-60 overflow-auto">
          {unfiledCount > 0 && (
            <li>
              <div
                className="flex items-center gap-1 rounded px-1 py-1 text-xs hover:bg-card-bg"
                style={{ paddingLeft: 4 }}
              >
                <span className="h-4 w-4 shrink-0" />
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sel.has(UNFILED_TOKEN)}
                    onChange={() => toggle(UNFILED_TOKEN)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-card-border bg-card-bg accent-brand-blue"
                  />
                  <span className="truncate italic text-muted">Unfiled</span>
                  <span className="text-[10px] text-muted">({unfiledCount})</span>
                </label>
              </div>
            </li>
          )}
          {tree.map((node) => (
            <FolderNode key={node.id} node={node} depth={0} sel={sel} toggle={toggle} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FolderNode({
  node,
  depth,
  sel,
  toggle,
}: {
  node: DocumentFolderTreeNode;
  depth: number;
  sel: Set<string>;
  toggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className="flex items-center gap-1 rounded px-1 py-1 text-xs hover:bg-card-bg"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse" : "Expand"}
            className="grid h-4 w-4 shrink-0 place-items-center text-muted hover:text-foreground"
          >
            <svg
              className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-90" : ""}`}
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.5 3 7.5 6 4.5 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <label className="flex flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={sel.has(node.id)}
            onChange={() => toggle(node.id)}
            className="h-3.5 w-3.5 shrink-0 rounded border-card-border bg-card-bg accent-brand-blue"
          />
          <span className="truncate text-foreground">{node.name}</span>
          <span className="text-[10px] text-muted">({node.totalDocumentCount})</span>
        </label>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((c) => (
            <FolderNode key={c.id} node={c} depth={depth + 1} sel={sel} toggle={toggle} />
          ))}
        </ul>
      )}
    </li>
  );
}
