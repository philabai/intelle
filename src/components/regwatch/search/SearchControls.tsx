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
  parseCsv,
} from "@/lib/regwatch/taxonomy";

interface RegulatorOption {
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
}

const SAMPLE_QUERIES = [
  "methane emission reduction in oil and gas",
  "40 CFR 261.4",
  "What does CBAM require for cement importers?",
  "PFAS restriction REACH Annex XVII",
  "FuelEU Maritime GHG intensity 2030 target",
];

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

/**
 * The full search-bar control cluster — source picker, query input, and an
 * "Advanced search" facet panel — with DEFERRED submit.
 *
 * Every control writes to LOCAL state only, so toggling checkboxes / facets is
 * instant (no per-keystroke navigation, no search re-run). Nothing hits the
 * server until the user presses Search or Enter, which serialises the whole
 * state into the URL in one navigation. A subtle hint flags unapplied changes.
 *
 * The parent keys this component by the URL param signature, so external
 * navigations (saved-search "Run", back button) remount it and re-seed local
 * state from the URL.
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
  const [isPending, startTransition] = useTransition();

  // Applied state (what the URL currently reflects).
  const appliedSources = parseSources(params.get("sources"));
  const appliedRegulators = parseCsv(params.get("regulator"));
  const appliedTopics = parseCsv(params.get("topic"));
  const appliedInstrumentTypes = parseCsv(params.get("instrument_type"));
  const appliedStatuses = parseCsv(params.get("status"));

  // Pending (local) state — seeded once from the applied state on mount.
  const [query, setQuery] = useState(initialQuery);
  const [sources, setSources] = useState<string[]>(appliedSources);
  const [regulatorSel, setRegulatorSel] = useState<string[]>(appliedRegulators);
  const [topicSel, setTopicSel] = useState<string[]>(appliedTopics);
  const [instrumentSel, setInstrumentSel] = useState<string[]>(appliedInstrumentTypes);
  const [statusSel, setStatusSel] = useState<string[]>(appliedStatuses);

  const activeFacetGroups = [regulatorSel, topicSel, instrumentSel, statusSel].filter(
    (a) => a.length > 0,
  ).length;
  const [advancedOpen, setAdvancedOpen] = useState(activeFacetGroups > 0);

  // Have the filters diverged from what's applied? (Query is excluded — that's
  // what the Search button is obviously for.)
  const filtersDirty =
    !sameSet(sources, appliedSources) ||
    !sameSet(regulatorSel, appliedRegulators) ||
    !sameSet(topicSel, appliedTopics) ||
    !sameSet(instrumentSel, appliedInstrumentTypes) ||
    !sameSet(statusSel, appliedStatuses);

  function buildUrl(q: string): string {
    const next = new URLSearchParams();
    const qt = q.trim();
    if (qt) next.set("q", qt);
    // Omit `sources` when it's the default (regulations-only) to keep URLs clean.
    if (sources.length === 0) next.set("sources", "none");
    else if (!(sources.length === 1 && sources[0] === "regulations"))
      next.set("sources", serializeSources(sources));
    if (regulatorSel.length) next.set("regulator", regulatorSel.join(","));
    if (topicSel.length) next.set("topic", topicSel.join(","));
    if (instrumentSel.length) next.set("instrument_type", instrumentSel.join(","));
    if (statusSel.length) next.set("status", statusSel.join(","));
    return `${pathname}?${next.toString()}`;
  }

  function run(q: string) {
    startTransition(() => router.push(buildUrl(q)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(query);
  }

  function toggleSource(value: string, checked: boolean) {
    const set = new Set(sources);
    if (checked) set.add(value);
    else set.delete(value);
    setSources(SOURCE_TAXONOMY.filter((s) => set.has(s.value)).map((s) => s.value));
  }

  function clearFilters() {
    setSources(["regulations"]);
    setRegulatorSel([]);
    setTopicSel([]);
    setInstrumentSel([]);
    setStatusSel([]);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* Row 1 — source chips + advanced toggle */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Sources
          </span>
          {SOURCE_TAXONOMY.map((s) => {
            const checked = sources.includes(s.value);
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
                    checked ? "border-brand-blue bg-brand-blue text-white" : "border-card-border"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                {s.label}
              </button>
            );
          })}
          {sources.length === 0 && (
            <span
              className="text-[11px] text-muted"
              title="No source selected — searching every source (regulations, policies & news)"
            >
              All sources
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted transition hover:border-brand-blue/50 hover:text-foreground"
        >
          <span className="font-medium">Advanced search</span>
          {activeFacetGroups > 0 && (
            <span className="rounded-full bg-brand-blue/20 px-1.5 text-[10px] font-semibold text-brand-blue">
              {activeFacetGroups}
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

      {/* Row 2 — query input + Search button */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything, paste a citation, or search keywords…"
          className="flex-1 rounded-md border border-card-border bg-card-bg px-4 py-3 text-base text-foreground placeholder:text-muted/70 focus:border-brand-blue focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={isPending}
          className="relative rounded-md bg-brand-blue px-6 py-3 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60"
        >
          Search
          {filtersDirty && (
            <span
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background"
              title="Filters changed — press Search to apply"
            />
          )}
        </button>
      </div>

      {/* Dirty hint + sample queries */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {filtersDirty && (
          <span className="text-[11px] text-amber-400">
            Filters changed — press Search to apply.
          </span>
        )}
        {!initialQuery && !filtersDirty && (
          <>
            <span className="text-[11px] uppercase tracking-wider text-muted">Try:</span>
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuery(q);
                  run(q);
                }}
                className="rounded-full border border-card-border bg-card-bg px-2 py-0.5 text-[11px] text-muted hover:border-brand-teal hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </>
        )}
      </div>

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
                <CheckboxFacet
                  label="Regulator"
                  value={regulatorSel}
                  onChange={setRegulatorSel}
                  options={regulators.map((r) => ({
                    value: r.slug,
                    label: r.short_name ?? r.name,
                  }))}
                />
              )}
              <CheckboxFacet
                label="Topic"
                value={topicSel}
                onChange={setTopicSel}
                options={TOPIC_TAXONOMY}
              />
              <CheckboxFacet
                label="Instrument type"
                value={instrumentSel}
                onChange={setInstrumentSel}
                options={INSTRUMENT_TYPE_TAXONOMY}
              />
              <CheckboxFacet
                label="Status"
                value={statusSel}
                onChange={setStatusSel}
                options={STATUS_TAXONOMY}
              />
            </div>
            {activeFacetGroups > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] text-muted underline hover:text-foreground"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * A facet rendered as a fully-visible checkbox list — every option shown with a
 * checkbox beside it (no search box; users shouldn't need to know the values).
 * Long lists scroll within a bounded height. Local/controlled.
 */
function CheckboxFacet({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const selected = new Set(value);

  function toggle(v: string) {
    const next = new Set(value);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange([...next]);
  }

  return (
    <div className="rounded-lg border border-card-border bg-background/40">
      <div className="flex items-center justify-between border-b border-card-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-muted hover:text-foreground"
          >
            Clear ({value.length})
          </button>
        )}
      </div>
      <ul className="max-h-52 overflow-auto p-1.5">
        {options.map((o) => {
          const checked = selected.has(o.value);
          return (
            <li key={o.value}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-card-bg">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-card-border bg-card-bg accent-brand-blue focus:ring-brand-blue"
                />
                <span className="text-foreground">{o.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
