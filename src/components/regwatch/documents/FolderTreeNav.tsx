"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
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
  const t = useTranslations("regwatch.documents");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { ask: askPrompt, dialog: promptDialog } = usePromptDialog();
  const { ask: askConfirm, dialog: confirmDialog } = useConfirmDialog();

  async function handleCreate(parentId: string | null) {
    const name = await askPrompt({
      title: parentId ? t("newSubFolder") : t("newProjectFolder"),
      placeholder: t("folderNamePlaceholder"),
      description: parentId
        ? t("createdInsideFolder")
        : t("createdTopLevel"),
      confirmLabel: t("create"),
    });
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await createFolder({ name, parentId });
      if (!res.ok) {
        setError(res.error ?? t("couldNotCreateFolder"));
        return;
      }
      router.refresh();
    });
  }

  async function handleRename(node: DocumentFolderTreeNode) {
    const name = await askPrompt({
      title: t("renameFolder"),
      defaultValue: node.name,
      confirmLabel: t("rename"),
    });
    if (!name || name === node.name) return;
    setError(null);
    startTransition(async () => {
      const res = await updateFolder({ id: node.id, name });
      if (!res.ok) {
        setError(res.error ?? t("couldNotRename"));
        return;
      }
      router.refresh();
    });
  }

  async function handleArchive(node: DocumentFolderTreeNode) {
    const hasContent =
      node.totalDocumentCount > 0 || node.children.length > 0;
    const ok = await askConfirm({
      title: t("archiveFolder"),
      description: hasContent
        ? t("archiveFolderConfirm", {
            name: node.name,
            docCount: node.totalDocumentCount,
            subCount: node.children.length,
          })
        : t("archiveEmptyFolderConfirm", { name: node.name }),
      confirmLabel: t("archive"),
      danger: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await archiveFolder({ id: node.id, force: hasContent });
      if (!res.ok) {
        setError(res.error ?? t("couldNotArchive"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("folders")}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => handleCreate(null)}
            disabled={pending}
            title={t("createTopLevelTitle")}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-blue disabled:opacity-50"
          >
            {t("newShort")}
          </button>
        )}
      </div>
      <nav className="space-y-1 text-sm">
        <RootRow
          href={ALL_HREF}
          label={t("headerAll")}
          tooltip={t("allDocumentsTooltip")}
          count={totalDocCount}
          active={activeFolderKey === null}
        />
        <RootRow
          href={UNFILED_HREF}
          label={t("headerUnfiled")}
          tooltip={t("unfiledTooltip")}
          count={unfiledCount}
          active={activeFolderKey === "unfiled"}
        />
      </nav>
      <ul className="space-y-1">
        {roots.length === 0 ? (
          <li className="rounded-md border border-dashed border-card-border bg-card-bg/30 p-3 text-center text-[11px] text-muted">
            {t("noFoldersYet")}{" "}
            {canEdit ? t("noFoldersCanEdit") : t("noFoldersAskAdmin")}
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
  tooltip,
  count,
  active,
}: {
  href: string;
  label: string;
  tooltip: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={tooltip}
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
  const t = useTranslations("regwatch.documents");
  const [open, setOpen] = useState(true);
  const isActive = activeFolderKey === node.id;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md py-1 ps-1 pe-2 text-sm transition ${
          isActive ? "bg-brand-teal/10" : "hover:bg-card-bg"
        }`}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-5 w-5 place-items-center text-muted hover:text-foreground"
            aria-label={open ? t("collapse") : t("expand")}
            title={open ? t("collapseSubFolders") : t("expandSubFolders")}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}
        <Link
          href={`/regwatch/documents?folder=${node.id}`}
          title={t("openFolderTitle", {
            name: node.name,
            count: node.totalDocumentCount,
          })}
          className={`flex flex-1 items-center justify-between truncate ${
            isActive ? "text-brand-teal" : "text-foreground"
          }`}
        >
          <span className="truncate">{node.name}</span>
          <span className="ms-2 text-[10px] text-muted">
            {node.totalDocumentCount}
          </span>
        </Link>
        {canEdit && (
          <span className="flex gap-0.5 md:hidden md:group-hover:flex">
            <button
              type="button"
              onClick={() => onAddChild(node.id)}
              disabled={pending}
              aria-label={t("addSubFolderAria", { name: node.name })}
              title={t("addSubFolderTitle", { name: node.name })}
              className="grid h-5 w-5 place-items-center text-[12px] text-muted hover:text-brand-teal disabled:opacity-50"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onRename(node)}
              disabled={pending}
              aria-label={t("renameAria", { name: node.name })}
              title={t("renameTitle", { name: node.name })}
              className="grid h-5 w-5 place-items-center text-[10px] text-muted hover:text-foreground disabled:opacity-50"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => onArchive(node)}
              disabled={pending}
              aria-label={t("archiveAria", { name: node.name })}
              title={t("archiveTitle", { name: node.name })}
              className="grid h-5 w-5 place-items-center text-[10px] text-muted hover:text-red-400 disabled:opacity-50"
            >
              ⊘
            </button>
          </span>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul className="ms-4 space-y-1 border-s border-card-border/40 ps-1">
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
