/**
 * Curated country list for the Footprint Configurator's geography step.
 *
 * Phase 1.1 — focused on the jurisdictions RegWatch monitors. The list grows
 * as Phase 1.x adds regional regulators (Latin America, Asia, Africa beyond
 * MEA). Each row pairs an ISO 3166-1 alpha-2 code with a display label and
 * the region bucket used by the jurisdiction_summary view.
 */

export type RegwatchRegion = "na" | "eu" | "uk" | "mea" | "asia" | "lac" | "int";

export interface CountryOption {
  code: string;
  name: string;
  region: RegwatchRegion;
}

export const COUNTRIES: CountryOption[] = [
  // North America
  { code: "US", name: "United States", region: "na" },
  { code: "CA", name: "Canada", region: "na" },
  { code: "MX", name: "Mexico", region: "na" },

  // European Union (member states most relevant to industrial compliance)
  { code: "EU", name: "European Union (multi-state)", region: "eu" },
  { code: "DE", name: "Germany", region: "eu" },
  { code: "FR", name: "France", region: "eu" },
  { code: "NL", name: "Netherlands", region: "eu" },
  { code: "IT", name: "Italy", region: "eu" },
  { code: "ES", name: "Spain", region: "eu" },
  { code: "BE", name: "Belgium", region: "eu" },
  { code: "DK", name: "Denmark", region: "eu" },
  { code: "FI", name: "Finland", region: "eu" },
  { code: "SE", name: "Sweden", region: "eu" },
  { code: "PL", name: "Poland", region: "eu" },
  { code: "NO", name: "Norway", region: "eu" },

  // United Kingdom
  { code: "UK", name: "United Kingdom", region: "uk" },

  // Middle East + Africa
  { code: "AE", name: "United Arab Emirates", region: "mea" },
  { code: "SA", name: "Saudi Arabia", region: "mea" },
  { code: "QA", name: "Qatar", region: "mea" },
  { code: "KW", name: "Kuwait", region: "mea" },
  { code: "OM", name: "Oman", region: "mea" },
  { code: "BH", name: "Bahrain", region: "mea" },
  { code: "EG", name: "Egypt", region: "mea" },
  { code: "JO", name: "Jordan", region: "mea" },
  { code: "IL", name: "Israel", region: "mea" },
  { code: "ZA", name: "South Africa", region: "mea" },
  { code: "NG", name: "Nigeria", region: "mea" },

  // Asia
  { code: "IN", name: "India", region: "asia" },
  { code: "CN", name: "China", region: "asia" },
  { code: "JP", name: "Japan", region: "asia" },
  { code: "KR", name: "South Korea", region: "asia" },
  { code: "SG", name: "Singapore", region: "asia" },
  { code: "MY", name: "Malaysia", region: "asia" },
  { code: "ID", name: "Indonesia", region: "asia" },
  { code: "AU", name: "Australia", region: "asia" },

  // Latin America + Caribbean
  { code: "BR", name: "Brazil", region: "lac" },
  { code: "CL", name: "Chile", region: "lac" },
  { code: "CO", name: "Colombia", region: "lac" },
  { code: "AR", name: "Argentina", region: "lac" },

  // International (cross-border frameworks)
  { code: "INT", name: "International (IMO / IFRS / IFC)", region: "int" },
];

export const COUNTRIES_BY_REGION: Record<RegwatchRegion, CountryOption[]> = COUNTRIES.reduce(
  (acc, c) => {
    (acc[c.region] ??= []).push(c);
    return acc;
  },
  {} as Record<RegwatchRegion, CountryOption[]>,
);

export const REGION_LABEL: Record<RegwatchRegion, string> = {
  na: "North America",
  eu: "European Union",
  uk: "United Kingdom",
  mea: "Middle East & Africa",
  asia: "Asia & Pacific",
  lac: "Latin America & Caribbean",
  int: "International",
};

export function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
