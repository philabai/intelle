"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  SOURCE_TAXONOMY,
  TOPIC_TAXONOMY,
  INSTRUMENT_TYPE_TAXONOMY,
  STATUS_TAXONOMY,
  parseSources,
  serializeSources,
} from "@/lib/regwatch/taxonomy";
import { SearchInput } from "./SearchInput";

interface RegulatorOption {
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
}

/**
 * The full search-bar control cluster, always visible (before and after a
 * query):
 *   1. Source picker — Regulations / Policies / News chips over instrument_type
 *      buckets. Regulations-only by default so the IEA policy lane doesn't
 *      dominate; users opt the others in.
 *   2. The search input itself.
 *   3. An "Advanced search" disclosure that slides the facet dropdowns
 *      (Regulator / Topic / Instrument type / Status) open below the input —
 *      so the search bar stays put and the page below simply reflows.
 *
 * Every control is URL-state driven and preserves the `q` query, mirroring the
 * facet-as-link pattern used on Browse.
 */
export function SearchControls({
  regulators,
  initialQuery = "",
}: {
  regulators: RegulatorOption[];
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedSources = parseSources(params.get("sources"));
  const activeRegulator = params.get("regulator") ?? "";
  const activeTopic = params.get("topic") ?? "";
  const activeInstrument = params.get("instrument_type") ?? "";
  const activeStatus = params.get("status") ?? "";
  const activeFacetCount = [
    activeRegulator,
    activeTopic,
    activeInstrument,
    activeStatus,
  ].filter(Boolean).length;

  // Open the panel by default when arriving with facets already applied.
  const [advancedOpen, setAdvancedOpen] = useState(activeFacetCount > 0);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  function toggleSource(value: string, checked: boolean) {
    const set = new Set(selectedSources);
    if (checked) set.add(value);
    else set.delete(value);
    const ordered = SOURCE_TAXONOMY.filter((s) => set.has(s.value)).map((s) => s.value);
    updateParam("sources", serializeSources(ordered));
  }

  function clearFacets() {
    const next = new URLSearchParams(params.toString());
    ["regulator", "topic", "instrument_type", "status"].forEach((k) => next.delete(k));
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="space-y-3">
      {/* Row 1 — source chips + advanced toggle */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Sources
          </span>
          {SOURCE_TAXONOMY.map((s) => {
            const checked = selectedSources.includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSource(s.value, !checked)}
                title={s.description}
                aria-pressed={checked}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                  checked
                    ? "border-brand-blue bg-brand-blue/15 text-foreground"
                    : "border-card-border bg-card-bg text-muted hover:border-brand-blue/50 hover:text-foreground"
                }`}
              >
                <span
                  className={`grid h-3.5 w-3.5 place-items-center rounded-[3px] border text-[9px] leading-none ${
                    checked
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-card-border"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                {s.label}
              </button>
            );
          })}
          {selectedSources.length === 0 && (
            <span className="text-[11px] text-amber-400">Pick a source to search.</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted transition hover:border-brand-blue/50 hover:text-foreground"
        >
          <span className="font-medium">Advanced search</span>
          {activeFacetCount > 0 && (
            <span className="rounded-full bg-brand-blue/20 px-1.5 text-[10px] font-semibold text-brand-blue">
              {activeFacetCount}
            </span>
          )}
          <svg
            className={`h-3 w-3 transition-transform duration-300 ${advancedOpen ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 4.5 6 7.5 9 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Row 2 — the search input */}
      <SearchInput initialQuery={initialQuery} />

      {/* Row 3 — advanced facet panel, slides open below the input */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          advancedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl border border-card-border bg-card-bg/50 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {regulators.length > 0 && (
                <FacetSelect
                  label="Regulator"
                  value={activeRegulator}
                  onChange={(v) => updateParam("regulator", v)}
                  options={regulators.map((r) => ({
                    value: r.slug,
                    label: r.short_name ?? r.name,
                  }))}
                />
              )}
              <FacetSelect
                label="Topic"
                value={activeTopic}
                onChange={(v) => updateParam("topic", v)}
                options={TOPIC_TAXONOMY}
              />
              <FacetSelect
                label="Instrument type"
                value={activeInstrument}
                onChange={(v) => updateParam("instrument_type", v)}
                options={INSTRUMENT_TYPE_TAXONOMY}
              />
              <FacetSelect
                label="Status"
                value={activeStatus}
                onChange={(v) => updateParam("status", v)}
                options={STATUS_TAXONOMY}
              />
            </div>
            {activeFacetCount > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearFacets}
                  className="text-[11px] text-muted underline hover:text-foreground"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FacetSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
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
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
