"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  deleteSavedSearch,
  renameSavedSearch,
} from "@/lib/regwatch/saved-searches-actions";

interface Props {
  id: string;
  query: string;
  label: string | null;
  resultCountAtSave: number | null;
  createdAt: string;
}

export function SavedSearchRow({
  id,
  query,
  label,
  resultCountAtSave,
  createdAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label ?? "");
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    if (
      !confirm(
        `Delete saved search "${label ?? query}"? This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSavedSearch({ id });
      if (!res.ok) {
        setError(res.error ?? "Delete failed");
        return;
      }
      router.refresh();
    });
  }

  function onRename() {
    setError(null);
    startTransition(async () => {
      const res = await renameSavedSearch({ id, label: draftLabel.trim() });
      if (!res.ok) {
        setError(res.error ?? "Rename failed");
        return;
      }
      setRenaming(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-md border border-card-border bg-background/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Label (optional)"
                autoFocus
                className="min-w-0 flex-1 rounded-md border border-card-border bg-background px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={onRename}
                disabled={pending}
                className="rounded-md bg-brand-blue px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false);
                  setDraftLabel(label ?? "");
                }}
                className="text-[11px] text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {label ? (
                <>
                  <p className="truncate text-sm font-medium text-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    Query: <span className="text-foreground/80">{query}</span>
                  </p>
                </>
              ) : (
                <p className="truncate text-sm font-medium text-foreground">
                  {query}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] text-muted">
          Saved{" "}
          {formatDistanceToNowStrict(new Date(createdAt), { addSuffix: true })}
          {resultCountAtSave !== null && (
            <> · {resultCountAtSave} matches at save</>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/regwatch/search?q=${encodeURIComponent(query)}`}
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-foreground hover:border-brand-blue"
          >
            Run →
          </Link>
          {!renaming && (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
            >
              Rename
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}
    </li>
  );
}
