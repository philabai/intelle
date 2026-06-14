"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  deleteSavedSearch,
  renameSavedSearch,
} from "@/lib/regwatch/saved-searches-actions";

interface Props {
  id: string;
  query: string;
  label: string | null;
  filters: Record<string, unknown>;
  resultCountAtSave: number | null;
  createdAt: string;
}

/** Rebuild the search URL from the saved query + stored filter params. */
function runHref(query: string, filters: Record<string, unknown>): string {
  const params = new URLSearchParams({ q: query });
  for (const k of ["sources", "regulator", "topic", "instrument_type", "status"]) {
    const v = filters?.[k];
    if (typeof v === "string" && v) params.set(k, v);
  }
  return `/regwatch/search?${params.toString()}`;
}

export function SavedSearchRow({
  id,
  query,
  label,
  filters,
  resultCountAtSave,
  createdAt,
}: Props) {
  const t = useTranslations("regwatch.monitor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label ?? "");
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    if (!confirm(t("savedDeleteConfirm", { name: label ?? query }))) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSavedSearch({ id });
      if (!res.ok) {
        setError(res.error ?? t("savedDeleteError"));
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
        setError(res.error ?? t("savedRenameError"));
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
                placeholder={t("savedLabelPlaceholder")}
                autoFocus
                className="min-w-0 flex-1 rounded-md border border-card-border bg-background px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={onRename}
                disabled={pending}
                className="rounded-md bg-brand-blue px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
              >
                {t("save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(false);
                  setDraftLabel(label ?? "");
                }}
                className="text-[11px] text-muted hover:text-foreground"
              >
                {t("cancel")}
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
                    {t("queryPrefix")}{" "}
                    <span className="text-foreground/80">{query}</span>
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
          {t("savedAt", {
            time: formatDistanceToNowStrict(new Date(createdAt), {
              addSuffix: true,
            }),
          })}
          {resultCountAtSave !== null && (
            <> · {t("matchesAtSave", { count: resultCountAtSave })}</>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={runHref(query, filters)}
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-foreground hover:border-brand-blue"
          >
            {t("run")}
          </Link>
          {!renaming && (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
            >
              {t("rename")}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
          >
            {t("delete")}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}
    </li>
  );
}
