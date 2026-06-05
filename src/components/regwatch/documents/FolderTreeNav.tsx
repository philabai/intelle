"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createFolder,
  updateFolder,
  archiveFolder,
} from "@/lib/regwatch/document-folders-actions";
import type { DocumentFolderTreeNode } from "@/lib/regwatch/document-folders";
import { usePromptDialog, useConfirmDialog } from "@/components/regwatch/PromptDialog";

interface Props {
  roots: DocumentFolderTreeNode[];
  /** "unfiled" | folderId | null (= All documents pseudo-root). */
  activeFolderKey: string | null;
  /** Total docs in "Unfiled". */
  unfiledCount: number;
  canEdit: boolean;
  /** Total docs across all folders + unfiled. */
  totalDocCount: number;
}

const ALL_HREF = "/regwatch/documents";
const UNFILED_HREF = "/regwatch/documents?folder=unfiled";

export function FolderTreeNav({
  roots,
  activeFolderKey,
  unfiledCount,
  canEdit,
  totalDocCount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { ask: askPrompt, dialog: promptDialog } = usePromptDialog();
  const { ask: askConfirm, dialog: confirmDialog } = useConfirmDialog();

  async function handleCreate(parentId: string | null) {
    const name = await askPrompt({
      title: parentId ? "New sub-folder" : "New project folder",
      placeholder: "e.g. Refinery shutdown 2026 — EHS evidence",
      description: parentId
        ? "Created inside the current folder."
        : "Created as a top-level project folder.",
      confirmLabel: "Create",
    });
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await createFolder({ name, parentId });
      if (!res.ok) {
        setError(res.error ?? "Could not create folder");
        return;
      }
      router.refresh();
    });
  }

  async function handleRename(node: DocumentFolderTreeNode) {
    const name = await askPrompt({
      title: "Rename folder",
      defaultValue: node.name,
      confirmLabel: "Rename",
    });
    if (!name || name === node.name) return;
    setError(null);
    startTransition(async () => {
      const res = await updateFolder({ id: node.id, name });
      if (!res.ok) {
        setError(res.error ?? "Could not rename");
        return;
      }
      router.refresh();
    });
  }

  async function handleArchive(node: DocumentFolderTreeNode) {
    const hasContent =
      node.totalDocumentCount > 0 || node.children.length > 0;
    const ok = await askConfirm({
      title: "Archive folder",
      description: hasContent
        ? `"${node.name}" contains ${node.totalDocumentCount} document${node.totalDocumentCount === 1 ? "" : "s"} and ${node.children.length} sub-folder${node.children.length === 1 ? "" : "s"}. Archiving moves the documents to Unfiled (so nothing is lost) and removes the folder structure. Continue?`
        : `Archive the empty folder "${node.name}"?`,
      confirmLabel: "Archive",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await archiveFolder({ id: node.id, force: hasContent });
      if (!res.ok) {
        setError(res.error ?? "Could not archive");
        return;
      }
      router.refresh();
    });
  }

  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Folders
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => handleCreate(null)}
            disabled={pending}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-blue disabled:opacity-50"
          >
            + New
          </button>
        )}
      </div>
      <nav className="space-y-1 text-sm">
        <RootRow
          href={ALL_HREF}
          label="All documents"
          count={totalDocCount}
          active={activeFolderKey === null}
        />
        <RootRow
          href={UNFILED_HREF}
          label="Unfiled"
          count={unfiledCount}
          active={activeFolderKey === "unfiled"}
        />
      </nav>
      <ul className="space-y-1">
        {roots.length === 0 ? (
          <li className="rounded-md border border-dashed border-card-border bg-card-bg/30 p-3 text-center text-[11px] text-muted">
            No folders yet. {canEdit ? "Click + New to create your first project folder." : "Ask an admin to create one."}
          </li>
        ) : (
          roots.map((n) => (
            <FolderRow
              key={n.id}
              node={n}
              activeFolderKey={activeFolderKey}
              canEdit={canEdit}
              onAddChild={handleCreate}
              onRename={handleRename}
              onArchive={handleArchive}
              pending={pending}
            />
          ))
        )}
      </ul>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {promptDialog}
      {confirmDialog}
    </aside>
  );
}

function RootRow({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition ${
        active
          ? "bg-brand-teal/10 text-brand-teal"
          : "text-foreground hover:bg-card-bg"
      }`}
    >
      <span>{label}</span>
      <span className="text-[10px] text-muted">{count}</span>
    </Link>
  );
}

function FolderRow({
  node,
  activeFolderKey,
  canEdit,
  onAddChild,
  onRename,
  onArchive,
  pending,
}: {
  node: DocumentFolderTreeNode;
  activeFolderKey: string | null;
  canEdit: boolean;
  onAddChild: (parentId: string | null) => void;
  onRename: (node: DocumentFolderTreeNode) => void;
  onArchive: (node: DocumentFolderTreeNode) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(true);
  const isActive = activeFolderKey === node.id;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md py-1 pl-1 pr-2 text-sm transition ${
          isActive ? "bg-brand-teal/10" : "hover:bg-card-bg"
        }`}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-5 w-5 place-items-center text-muted hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}
        <Link
          href={`/regwatch/documents?folder=${node.id}`}
          className={`flex flex-1 items-center justify-between truncate ${
            isActive ? "text-brand-teal" : "text-foreground"
          }`}
        >
          <span className="truncate">{node.name}</span>
          <span className="ml-2 text-[10px] text-muted">
            {node.totalDocumentCount}
          </span>
        </Link>
        {canEdit && (
          <span className="hidden gap-0.5 group-hover:flex">
            <button
              type="button"
              onClick={() => onAddChild(node.id)}
              disabled={pending}
              title="Add sub-folder"
              className="grid h-5 w-5 place-items-center text-[12px] text-muted hover:text-brand-teal disabled:opacity-50"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onRename(node)}
              disabled={pending}
              title="Rename"
              className="grid h-5 w-5 place-items-center text-[10px] text-muted hover:text-foreground disabled:opacity-50"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => onArchive(node)}
              disabled={pending}
              title="Archive"
              className="grid h-5 w-5 place-items-center text-[10px] text-muted hover:text-red-400 disabled:opacity-50"
            >
              ⊘
            </button>
          </span>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul className="ml-4 space-y-1 border-l border-card-border/40 pl-1">
          {node.children.map((c) => (
            <FolderRow
              key={c.id}
              node={c}
              activeFolderKey={activeFolderKey}
              canEdit={canEdit}
              onAddChild={onAddChild}
              onRename={onRename}
              onArchive={onArchive}
              pending={pending}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
