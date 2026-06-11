"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  SOURCE_TAXONOMY,
  TOPIC_TAXONOMY,
  INSTRUMENT_TYPE_TAXONOMY,
  STATUS_TAXONOMY,
  parseSources,
  serializeSources,
} from "@/lib/regwatch/taxonomy";

interface RegulatorOption {
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
}

interface Props {
  regulators: RegulatorOption[];
}

/**
 * Search-page facet sidebar. URL-state driven (each change pushes a new query
 * string → the server re-runs hybrid retrieval), mirroring BrowseFilters.
 *
 * The headline control is the SOURCE PICKER — three checkboxes (Regulations /
 * Policies / News) mapped onto instrument_type buckets. It defaults to
 * Regulations-only so the corpus isn't dominated by the policy/news lanes;
 * users opt into the others. Below it are the standard facet dropdowns. The
 * `q` param (the query itself) is preserved across every change.
 */
export function SearchFilters({ regulators }: Props) {
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
    // Keep the query (q); reset every facet back to defaults.
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  const selectedSources = parseSources(params.get("sources"));
  const activeRegulator = params.get("regulator") ?? "";
  const activeTopic = params.get("topic") ?? "";
  const activeInstrument = params.get("instrument_type") ?? "";
  const activeStatus = params.get("status") ?? "";

  // Non-default state = anything other than "regulations only" + no facets.
  const sourcesAreDefault =
    selectedSources.length === 1 && selectedSources[0] === "regulations";
  const hasActive =
    !sourcesAreDefault ||
    !!activeRegulator ||
    !!activeTopic ||
    !!activeInstrument ||
    !!activeStatus;

  function toggleSource(value: string, checked: boolean) {
    const set = new Set(selectedSources);
    if (checked) set.add(value);
    else set.delete(value);
    // Preserve the canonical taxonomy order for a stable param string.
    const ordered = SOURCE_TAXONOMY.filter((s) => set.has(s.value)).map((s) => s.value);
    updateParam("sources", serializeSources(ordered));
  }

  const filteredRegulators = regulators;

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Search sources
        </h2>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-[11px] text-muted underline hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>

      {/* Source picker — the headline control. Checkboxes over instrument_type
          buckets; Regulations-only by default. */}
      <div className="space-y-1.5 rounded-lg border border-card-border bg-card-bg p-2.5">
        {SOURCE_TAXONOMY.map((s) => {
          const checked = selectedSources.includes(s.value);
          return (
            <label
              key={s.value}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-xs hover:bg-background/40"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggleSource(s.value, e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
              />
              <span>
                <span className="font-medium text-foreground">{s.label}</span>
                <span className="block text-[11px] text-muted">{s.description}</span>
              </span>
            </label>
          );
        })}
        {selectedSources.length === 0 && (
          <p className="px-1 pt-1 text-[11px] text-amber-400">
            Select at least one source to see results.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-card-border pt-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Filters
        </h2>
      </div>

      {filteredRegulators.length > 0 && (
        <FacetSelect
          label="Regulator"
          value={activeRegulator}
          onChange={(v) => updateParam("regulator", v)}
          options={filteredRegulators.map((r) => ({
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
    </aside>
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
