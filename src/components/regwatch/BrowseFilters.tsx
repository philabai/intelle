"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTransition } from "react";
import {
  TOPIC_TAXONOMY,
  INSTRUMENT_TYPE_TAXONOMY,
  STATUS_TAXONOMY,
} from "@/lib/regwatch/taxonomy";

interface JurisdictionOption {
  code: string;
  name: string;
  count: number;
}

interface RegulatorOption {
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
  count: number;
}

interface Props {
  jurisdictions: JurisdictionOption[];
  regulators?: RegulatorOption[];
  /** When set, the jurisdiction facet is hidden (already scoped by route). */
  lockedJurisdiction?: string;
  /** When set, the regulator facet is hidden (already scoped by route). */
  lockedRegulator?: string;
}

/**
 * URL-state driven facet sidebar. Each change pushes a new query string and the
 * server re-renders the result list — no client-side fetching, matches the
 * GOV.UK / EUR-Lex pattern of facet-as-link.
 */
export function BrowseFilters({
  jurisdictions,
  regulators = [],
  lockedJurisdiction,
  lockedRegulator,
}: Props) {
  const t = useTranslations("regwatch.discover");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const activeJurisdiction = params.get("jurisdiction") ?? "";
  const activeRegulator = params.get("regulator") ?? "";
  const activeTopic = params.get("topic") ?? "";
  const activeInstrument = params.get("instrument_type") ?? "";
  const activeStatus = params.get("status") ?? "";
  // hide_news defaults to ON. The query string carries "0" to opt-IN to news.
  const hideNews = params.get("hide_news") !== "0";

  const hasActive =
    !!activeJurisdiction ||
    !!activeRegulator ||
    !!activeTopic ||
    !!activeInstrument ||
    !!activeStatus ||
    !!params.get("q") ||
    !hideNews;

  // When jurisdiction filter is active, narrow the regulator list to that jur.
  const filteredRegulators = activeJurisdiction
    ? regulators.filter((r) => r.jurisdiction_code === activeJurisdiction)
    : regulators;

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("filters")}
        </h2>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-[11px] text-muted underline hover:text-foreground"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      {/* Hide-news toggle — surfaced at the top because it changes the
          composition of every result, not just narrows it. */}
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-card-border bg-card-bg p-2.5 text-xs">
        <input
          type="checkbox"
          checked={hideNews}
          onChange={(e) => updateParam("hide_news", e.target.checked ? "" : "0")}
          className="mt-0.5 h-3.5 w-3.5 rounded border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
        />
        <span>
          <span className="font-medium text-foreground">{t("hideNews")}</span>
          <span className="block text-[11px] text-muted">
            {t("hideNewsHint")}
          </span>
        </span>
      </label>

      {!lockedJurisdiction && (
        <FacetSelect
          label={t("facetJurisdiction")}
          allLabel={t("facetAll")}
          value={activeJurisdiction}
          onChange={(v) => updateParam("jurisdiction", v)}
          options={jurisdictions.map((j) => ({
            value: j.code,
            label: `${j.name} (${j.count})`,
          }))}
        />
      )}
      {!lockedRegulator && filteredRegulators.length > 0 && (
        <FacetSelect
          label={t("facetRegulator")}
          allLabel={t("facetAll")}
          value={activeRegulator}
          onChange={(v) => updateParam("regulator", v)}
          options={filteredRegulators.map((r) => ({
            value: r.slug,
            label: `${r.short_name ?? r.name} (${r.count})`,
          }))}
        />
      )}
      <FacetSelect
        label={t("facetTopic")}
        allLabel={t("facetAll")}
        value={activeTopic}
        onChange={(v) => updateParam("topic", v)}
        options={TOPIC_TAXONOMY}
      />
      <FacetSelect
        label={t("facetInstrumentType")}
        allLabel={t("facetAll")}
        value={activeInstrument}
        onChange={(v) => updateParam("instrument_type", v)}
        options={INSTRUMENT_TYPE_TAXONOMY}
      />
      <FacetSelect
        label={t("facetStatus")}
        allLabel={t("facetAll")}
        value={activeStatus}
        onChange={(v) => updateParam("status", v)}
        options={STATUS_TAXONOMY}
      />
    </aside>
  );
}

function FacetSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
