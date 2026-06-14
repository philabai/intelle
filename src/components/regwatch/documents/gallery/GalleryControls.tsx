"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback } from "react";

export type OwnerFilter = "anyone" | "me";
export type SortOption = "updated" | "title" | "kind";

interface Props {
  ownerFilter: OwnerFilter;
  sort: SortOption;
}

/**
 * URL-state filter + sort controls. Owner filter mirrors the Google Docs
 * "Owned by anyone / me" chip; sort mirrors the icons next to it. Server
 * page reads `?owner=` and `?sort=` and renders accordingly.
 */
export function GalleryControls({ ownerFilter, sort }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OwnerPill
        active={ownerFilter}
        onChange={(next) => setParam("owner", next === "anyone" ? null : next)}
      />
      <SortPill
        active={sort}
        onChange={(next) => setParam("sort", next === "updated" ? null : next)}
      />
    </div>
  );
}

function OwnerPill({
  active,
  onChange,
}: {
  active: OwnerFilter;
  onChange: (next: OwnerFilter) => void;
}) {
  const t = useTranslations("regwatch.documents");
  return (
    <div className="inline-flex rounded-full border border-card-border bg-card-bg/30 p-0.5 text-[11px]">
      {(["anyone", "me"] as OwnerFilter[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1 transition ${
            active === opt
              ? "bg-background text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
          title={
            opt === "anyone"
              ? t("ownerAnyoneTitle")
              : t("ownerMeTitle")
          }
        >
          {opt === "anyone" ? t("ownedByAnyone") : t("ownedByMe")}
        </button>
      ))}
    </div>
  );
}

function SortPill({
  active,
  onChange,
}: {
  active: SortOption;
  onChange: (next: SortOption) => void;
}) {
  const t = useTranslations("regwatch.documents");
  const SORT_LABEL: Record<SortOption, string> = {
    updated: t("sortUpdated"),
    title: t("sortTitle"),
    kind: t("sortKind"),
  };
  return (
    <label className="inline-flex items-center gap-1 rounded-full border border-card-border bg-card-bg/30 px-3 py-1 text-[11px] text-muted">
      <span>{t("sortLabel")}</span>
      <select
        value={active}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="bg-transparent text-foreground focus:outline-none"
      >
        {(Object.keys(SORT_LABEL) as SortOption[]).map((opt) => (
          <option key={opt} value={opt} className="bg-card-bg text-foreground">
            {SORT_LABEL[opt]}
          </option>
        ))}
      </select>
    </label>
  );
}
