"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  NAICS,
  SECTOR_LABEL,
  type NaicsOption,
} from "@/lib/regwatch/reference/naics";
import { MultiSelectCheckboxes } from "./MultiSelectCheckboxes";

const SECTOR_ORDER: NaicsOption["sector"][] = [
  "upstream",
  "midstream",
  "downstream",
  "chemicals",
  "power",
  "manufacturing",
  "transport",
  "support",
];

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function ActivitiesPicker({ value, onChange }: Props) {
  const t = useTranslations("regwatch.comply");
  const groups = useMemo(
    () =>
      SECTOR_ORDER.map((sector) => ({
        groupLabel: SECTOR_LABEL[sector],
        options: NAICS.filter((n) => n.sector === sector).map((n) => ({
          value: n.code,
          label: n.label,
          hint: n.code,
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
      emptyLabel={t("noNaicsMatch")}
      className="max-h-80 overflow-y-auto rounded-lg border border-card-border bg-background/40 p-3"
    />
  );
}
