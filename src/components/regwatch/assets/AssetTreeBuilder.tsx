"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createAsset,
  updateAsset,
  archiveAsset,
  seedStarterPack,
} from "@/lib/regwatch/assets-actions";
import type { AssetTreeNode } from "@/lib/regwatch/assets";
import { STARTER_PACK_LIST } from "@/lib/regwatch/asset-starter-packs";
import {
  usePromptDialog,
  useConfirmDialog,
} from "@/components/regwatch/PromptDialog";

interface Props {
  initialFlat: {
    id: string;
    organizationId: string;
    parentId: string | null;
    level: 2 | 3 | 4 | 5 | 6;
    name: string;
    code: string | null;
    assetType: string | null;
    jurisdictionCode: string | null;
  }[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  level6Enabled: boolean;
  activeStarterPack: string | null;
}

interface FlatRow {
  id: string;
  parentId: string | null;
  level: 2 | 3 | 4 | 5 | 6;
  name: string;
  code: string | null;
  assetType: string | null;
  jurisdictionCode: string | null;
}

function buildTree(flat: FlatRow[]): AssetTreeNode[] {
  const byId = new Map<string, AssetTreeNode>();
  for (const r of flat) {
    byId.set(r.id, {
      id: r.id,
      organizationId: "",
      parentId: r.parentId,
      level: r.level,
      name: r.name,
      code: r.code,
      assetType: r.assetType,
      jurisdictionCode: r.jurisdictionCode,
      substancesCas: [],
      tags: [],
      archivedAt: null,
      createdAt: "",
      updatedAt: "",
      children: [],
    });
  }
  const roots: AssetTreeNode[] = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  const sort = (n: AssetTreeNode) => {
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

export function AssetTreeBuilder({
  initialFlat,
  levelLabels,
  level6Enabled,
  activeStarterPack,
}: Props) {
  const t = useTranslations("regwatch.comply");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const tree = useMemo(() => buildTree(initialFlat), [initialFlat]);
  const flatById = useMemo(() => {
    const m = new Map<string, FlatRow>();
    for (const r of initialFlat) m.set(r.id, r);
    return m;
  }, [initialFlat]);
  const selected = selectedId ? flatById.get(selectedId) ?? null : null;

  const maxLevel = level6Enabled ? 6 : 5;
  const { ask: askPrompt, dialog: promptDialog } = usePromptDialog();
  const { ask: askConfirm, dialog: confirmDialog } = useConfirmDialog();

  function refresh() {
    router.refresh();
  }

  function notify(kind: "ok" | "error", text: string) {
    setMessage({ kind, text });
    if (kind === "ok") setTimeout(() => setMessage(null), 3000);
  }

  async function handleAdd(
    parentId: string | null,
    level: 2 | 3 | 4 | 5 | 6,
  ) {
    const name = await askPrompt({
      title: t("newLevel", { label: levelLabels[level] }),
      placeholder: t("levelNamePlaceholder", { label: levelLabels[level] }),
      confirmLabel: t("add"),
    });
    if (!name) return;
    startTransition(async () => {
      const res = await createAsset({ parentId, level, name });
      if (!res.ok) {
        notify("error", res.error ?? t("errCouldNotCreateAsset"));
        return;
      }
      notify("ok", t("addedLevel", { label: levelLabels[level], name }));
      refresh();
    });
  }

  async function handleRename(id: string, currentName: string) {
    const name = await askPrompt({
      title: t("rename"),
      defaultValue: currentName,
      confirmLabel: t("rename"),
    });
    if (!name || name === currentName) return;
    startTransition(async () => {
      const res = await updateAsset({ id, name });
      if (!res.ok) {
        notify("error", res.error ?? t("errCouldNotRename"));
        return;
      }
      notify("ok", t("renamed"));
      refresh();
    });
  }

  async function handleArchive(id: string, name: string) {
    const ok = await askConfirm({
      title: t("archiveAsset"),
      description: t("archiveAssetConfirm", { name }),
      confirmLabel: t("archive"),
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await archiveAsset({ id });
      if (!res.ok) {
        notify("error", res.error ?? t("errCouldNotArchive"));
        return;
      }
      notify("ok", t("archived"));
      if (selectedId === id) setSelectedId(null);
      refresh();
    });
  }

  async function handleSeedPack(starterPack: string) {
    const sites = tree
      .filter((t) => t.level === 2)
      .map((s) => ({ id: s.id, name: s.name }));
    if (sites.length === 0) {
      notify("error", t("seedNeedLevel", { label: levelLabels[2] }));
      return;
    }
    const choice = await askPrompt({
      title: t("seedTitle", { pack: starterPack }),
      description: t("seedDescription", {
        label: levelLabels[2],
        available: sites.map((s) => s.name).join(", "),
      }),
      defaultValue: sites.map((s) => s.name).join(", "),
      confirmLabel: t("seed"),
      multiline: true,
    });
    if (!choice) return;
    const names = choice
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const siteIds = sites
      .filter((s) => names.includes(s.name.toLowerCase()))
      .map((s) => s.id);
    if (siteIds.length === 0) {
      notify("error", t("noMatchingLevel", { label: levelLabels[2] }));
      return;
    }
    startTransition(async () => {
      const res = await seedStarterPack({ starterPack, siteIds });
      if (!res.ok) {
        notify("error", res.error ?? t("errCouldNotSeed"));
        return;
      }
      notify(
        "ok",
        t("seeded", { pack: starterPack, count: siteIds.length, label: levelLabels[2] }),
      );
      refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t("assetTree")}</h2>
          <button
            type="button"
            onClick={() => handleAdd(null, 2)}
            disabled={pending}
            title={t("addTopLevelTooltip", { label: levelLabels[2] })}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {t("addLabel", { label: levelLabels[2] })}
          </button>
        </div>
        {tree.length === 0 ? (
          <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-6 text-center text-sm text-muted">
            {t("builderEmpty", { label: levelLabels[2] })}
          </p>
        ) : (
          <ul className="space-y-1">
            {tree.map((n) => (
              <BuilderRow
                key={n.id}
                node={n}
                levelLabels={levelLabels}
                maxLevel={maxLevel}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={handleAdd}
                onRename={handleRename}
                onArchive={handleArchive}
                pending={pending}
              />
            ))}
          </ul>
        )}
        {message && (
          <p
            className={`mt-3 text-xs ${message.kind === "ok" ? "text-brand-teal" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-card-border bg-card-bg/40 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("starterPacks")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("starterPacksHint", { label: levelLabels[2] })}
          </p>
          <ul className="mt-3 space-y-2">
            {STARTER_PACK_LIST.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSeedPack(p.id)}
                  disabled={pending}
                  className={`w-full rounded-md border px-3 py-2 text-start text-xs transition disabled:opacity-50 ${
                    activeStarterPack === p.id
                      ? "border-brand-teal bg-brand-teal/10 text-foreground"
                      : "border-card-border bg-card-bg text-foreground hover:border-brand-blue"
                  }`}
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {p.industries.join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected && (
          <section className="rounded-xl border border-card-border bg-card-bg/40 p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("selected")}
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground">
              {selected.name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {levelLabels[selected.level]} · {selected.code ?? t("noCode")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleRename(selected.id, selected.name)}
                disabled={pending}
                className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue disabled:opacity-50"
              >
                {t("rename")}
              </button>
              <button
                type="button"
                onClick={() => handleArchive(selected.id, selected.name)}
                disabled={pending}
                className="rounded-md border border-red-500/40 bg-transparent px-3 py-1.5 text-xs text-red-300 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                {t("archive")}
              </button>
            </div>
          </section>
        )}
      </aside>
      {promptDialog}
      {confirmDialog}
    </div>
  );
}

function BuilderRow({
  node,
  levelLabels,
  maxLevel,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onArchive,
  pending,
}: {
  node: AssetTreeNode;
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  maxLevel: 5 | 6;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string, level: 2 | 3 | 4 | 5 | 6) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string, name: string) => void;
  pending: boolean;
}) {
  const t = useTranslations("regwatch.comply");
  // Default-expand every level up to Asset Class (L4). Previously we only
  // expanded through Areas (L3), which meant that the moment a reviewer
  // added an Asset under an Asset Class the new child was created in the
  // DB but stayed hidden because the parent was collapsed. The user reported
  // it as "the asset isn't showing up" — surfacing it by default fixes that.
  // L5 → L6 (Components, opt-in) stays collapsed so heavy Asset rows don't
  // explode the tree.
  const [open, setOpen] = useState(node.level <= 4);
  const isSelected = selectedId === node.id;
  const nextLevel = (node.level + 1) as 2 | 3 | 4 | 5 | 6;
  const canAddChild = node.level < maxLevel;
  return (
    <li>
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
          isSelected ? "bg-brand-teal/10" : "hover:bg-card-bg"
        }`}
        style={{ paddingLeft: `${(node.level - 2) * 14 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-4 w-4 place-items-center text-muted hover:text-foreground"
            aria-label={open ? t("collapse") : t("expand")}
            title={open ? t("collapseChildren") : t("expandChildren")}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex flex-1 items-center gap-2 text-start"
        >
          <span className={`font-medium ${isSelected ? "text-brand-teal" : ""}`}>
            {node.name}
          </span>
          {node.code && (
            <span className="font-mono text-[10px] text-muted">{node.code}</span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {levelLabels[node.level as 2 | 3 | 4 | 5 | 6]}
          </span>
        </button>
        {canAddChild && (
          <button
            type="button"
            onClick={() => onAdd(node.id, nextLevel)}
            disabled={pending}
            className="rounded-md border border-card-border bg-card-bg px-2 py-0.5 text-[10px] text-foreground hover:border-brand-blue disabled:opacity-50"
            title={t("addChildTooltip", { label: levelLabels[nextLevel], parent: node.name })}
          >
            {t("addLabel", { label: levelLabels[nextLevel] })}
          </button>
        )}
        <button
          type="button"
          onClick={() => onRename(node.id, node.name)}
          disabled={pending}
          className="text-[10px] text-muted hover:text-foreground disabled:opacity-50"
          aria-label={t("renameNode", { name: node.name })}
          title={t("renameNodeTooltip", { name: node.name })}
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onArchive(node.id, node.name)}
          disabled={pending}
          className="text-[10px] text-muted hover:text-red-400 disabled:opacity-50"
          aria-label={t("archiveNode", { name: node.name })}
          title={t("archiveNodeTooltip", { name: node.name })}
        >
          ⊘
        </button>
      </div>
      {open && node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((c) => (
            <BuilderRow
              key={c.id}
              node={c}
              levelLabels={levelLabels}
              maxLevel={maxLevel}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={onAdd}
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
