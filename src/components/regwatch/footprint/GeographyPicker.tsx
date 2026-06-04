"use client";

import { useMemo } from "react";
import {
  COUNTRIES,
  REGION_LABEL,
  type RegwatchRegion,
} from "@/lib/regwatch/reference/countries";
import { MultiSelectCheckboxes } from "./MultiSelectCheckboxes";

const REGION_ORDER: RegwatchRegion[] = ["na", "eu", "uk", "mea", "asia", "lac", "int"];

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function GeographyPicker({ value, onChange }: Props) {
  const groups = useMemo(
    () =>
      REGION_ORDER.map((region) => ({
        groupLabel: REGION_LABEL[region],
        options: COUNTRIES.filter((c) => c.region === region).map((c) => ({
          value: c.code,
          label: c.name,
          hint: c.code,
        })),
      })),
    [],
  );

  return (
    <MultiSelectCheckboxes
      grouped
      options={groups}
      selected={value}
      onChange={onChange}
      searchable
      emptyLabel="No countries match the filter"
      className="max-h-80 overflow-y-auto rounded-lg border border-card-border bg-background/40 p-3"
    />
  );
}
