"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { setDocumentAssetLinks } from "@/lib/regwatch/internal-documents-actions";
import { AssetCheckboxTree } from "@/components/regwatch/AssetCheckboxTree";

interface AssetNode {
  id: string;
  parentId: string | null;
  level: 2 | 3 | 4 | 5 | 6;
  name: string;
  code: string | null;
}

interface LinkedAsset {
  linkId: string;
  assetId: string;
  assetName: string;
  assetLevel: number;
  assetCode: string | null;
}

interface Props {
  documentId: string;
  allAssets: AssetNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  currentLinks: LinkedAsset[];
  canEdit: boolean;
}

export function LinkAssetsPanel({
  documentId,
  allAssets,
  levelLabels,
  currentLinks,
  canEdit,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    currentLinks.map((l) => l.assetId),
  );
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await setDocumentAssetLinks({
        internalDocumentId: documentId,
        assetIds: selected,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save");
        return;
      }
      setEditing(false);
      const bits: string[] = [];
      if (res.added) bits.push(`+${res.added}`);
      if (res.removed) bits.push(`-${res.removed}`);
      setMessage(bits.length > 0 ? `Saved (${bits.join(" / ")})` : "No changes");
      router.refresh();
    });
  }

  function cancel() {
    setSelected(currentLinks.map((l) => l.assetId));
    setEditing(false);
    setError(null);
    setMessage(null);
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {currentLinks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
            Not linked to any assets yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {currentLinks.map((l) => (
              <li
                key={l.linkId}
                className="flex items-center justify-between gap-2 rounded-lg border border-card-border bg-card-bg/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/regwatch/assets/${l.assetId}`}
                    className="text-sm font-medium text-foreground hover:text-brand-teal"
                  >
                    {l.assetName}
                  </Link>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    {levelLabels[l.assetLevel as 2 | 3 | 4 | 5 | 6] ??
                      `L${l.assetLevel}`}
                    {l.assetCode && (
                      <span className="ms-2 font-mono normal-case">
                        {l.assetCode}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue"
          >
            {currentLinks.length === 0 ? "Link to assets" : "Edit asset links"}
          </button>
        )}
        {message && <p className="text-xs text-brand-teal">{message}</p>}
      </div>
    );
  }

  // Editing mode — tree picker.
  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search asset by name or code…"
        className="w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
      />
      <div className="max-h-96 overflow-auto">
        <AssetCheckboxTree
          flat={allAssets}
          levelLabels={levelLabels}
          value={selected}
          onChange={setSelected}
          search={search}
        />
      </div>
      <p className="text-[10px] text-muted">
        Click any parent (e.g. a {levelLabels[2]} or {levelLabels[3]}) to
        select / deselect its entire sub-tree. Selecting {selected.length} of{" "}
        {allAssets.length} assets.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-xs text-white hover:bg-brand-blue/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save links"}
        </button>
      </div>
    </div>
  );
}
