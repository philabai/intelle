"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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

export function RegulatorsPicker({ value, options, onChange }: Props) {
  const t = useTranslations("regwatch.comply");
  const REGION_LABEL: Record<string, string> = {
    na: t("regionNa"),
    eu: t("regionEu"),
    uk: t("regionUk"),
    mea: t("regionMea"),
    asia: t("regionAsia"),
    lac: t("regionLac"),
    int: t("regionInt"),
  };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return (
    <MultiSelectCheckboxes
      grouped
      options={groups}
      selected={value}
      onChange={onChange}
      searchable
      emptyLabel={t("noRegulatorsMatch")}
      className="max-h-96 overflow-y-auto rounded-lg border border-card-border bg-background/40 p-3"
    />
  );
}
