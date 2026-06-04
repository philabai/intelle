"use client";

import { useMemo } from "react";
import { MultiSelectCheckboxes } from "./MultiSelectCheckboxes";

interface RegulatorOption {
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
  region: string;
}

interface Props {
  value: string[];
  options: RegulatorOption[];
  onChange: (next: string[]) => void;
}

const REGION_ORDER = ["na", "eu", "uk", "mea", "asia", "lac", "int"];

const REGION_LABEL: Record<string, string> = {
  na: "North America",
  eu: "European Union",
  uk: "United Kingdom",
  mea: "Middle East & Africa",
  asia: "Asia & Pacific",
  lac: "Latin America & Caribbean",
  int: "International",
};

export function RegulatorsPicker({ value, options, onChange }: Props) {
  const groups = useMemo(() => {
    const byRegion = new Map<string, RegulatorOption[]>();
    options.forEach((r) => {
      if (!byRegion.has(r.region)) byRegion.set(r.region, []);
      byRegion.get(r.region)!.push(r);
    });
    return REGION_ORDER.filter((r) => byRegion.has(r)).map((region) => ({
      groupLabel: REGION_LABEL[region] ?? region,
      options: (byRegion.get(region) ?? []).map((r) => ({
        value: r.slug,
        label: r.name,
        hint: r.short_name ?? r.jurisdiction_code,
      })),
    }));
  }, [options]);

  return (
    <MultiSelectCheckboxes
      grouped
      options={groups}
      selected={value}
      onChange={onChange}
      searchable
      emptyLabel="No regulators match the filter"
      className="max-h-96 overflow-y-auto rounded-lg border border-card-border bg-background/40 p-3"
    />
  );
}
