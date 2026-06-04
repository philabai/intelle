"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

interface Props {
  jurisdictions: JurisdictionOption[];
  /** When set, the jurisdiction facet is hidden (already scoped by route). */
  lockedJurisdiction?: string;
}

/**
 * URL-state driven facet sidebar. Each change pushes a new query string and the
 * server re-renders the result list — no client-side fetching, matches the
 * GOV.UK / EUR-Lex pattern of facet-as-link.
 */
export function BrowseFilters({ jurisdictions, lockedJurisdiction }: Props) {
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
  const activeTopic = params.get("topic") ?? "";
  const activeInstrument = params.get("instrument_type") ?? "";
  const activeStatus = params.get("status") ?? "";
  const hasActive =
    !!activeJurisdiction || !!activeTopic || !!activeInstrument || !!activeStatus || !!params.get("q");

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Filters
        </h2>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-[11px] text-muted underline hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      {!lockedJurisdiction && (
        <FacetSelect
          label="Jurisdiction"
          value={activeJurisdiction}
          onChange={(v) => updateParam("jurisdiction", v)}
          options={jurisdictions.map((j) => ({
            value: j.code,
            label: `${j.name} (${j.count})`,
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
