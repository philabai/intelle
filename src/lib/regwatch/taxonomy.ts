/**
 * Static taxonomies + label helpers — pure data, safe to import from both
 * server and client components. Lives separately from queries.ts so client
 * components can read the constants without dragging the SSR Supabase client
 * (which uses cookies() from next/headers) into the client bundle.
 */

export const TOPIC_TAXONOMY: { value: string; label: string }[] = [
  { value: "emissions", label: "Emissions" },
  { value: "methane", label: "Methane" },
  { value: "reporting", label: "Reporting & disclosure" },
  { value: "permitting", label: "Permitting" },
  { value: "bunker-spec", label: "Bunker fuel spec" },
  { value: "carbon-market", label: "Carbon market" },
  { value: "pfas", label: "PFAS" },
  { value: "tax", label: "Tax" },
  { value: "sanctions", label: "Sanctions" },
  { value: "worker-safety", label: "Worker safety" },
  { value: "process-safety", label: "Process safety" },
  { value: "energy", label: "Energy" },
  { value: "pipelines", label: "Pipelines" },
  { value: "nuclear", label: "Nuclear" },
  { value: "radiation", label: "Radiation protection" },
  { value: "chemicals", label: "Chemicals" },
  { value: "standards", label: "Standards & conformity" },
  { value: "construction", label: "Construction & materials" },
  { value: "gulf", label: "Gulf / GCC" },
  { value: "gcc-alignment", label: "GCC alignment" },
  { value: "aviation", label: "Aviation" },
  { value: "aerospace", label: "Aerospace & space" },
  { value: "food-safety", label: "Food safety" },
  { value: "drugs", label: "Drugs & pharmaceuticals" },
  { value: "medical-devices", label: "Medical devices" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "tobacco", label: "Tobacco" },
  // IEA policy themes
  { value: "fuels", label: "Fuels" },
  { value: "power", label: "Power" },
  { value: "industry", label: "Industry" },
  { value: "buildings", label: "Buildings" },
  { value: "transport", label: "Transport" },
  { value: "critical-minerals", label: "Critical minerals" },
  { value: "energy-efficiency", label: "Energy efficiency" },
  { value: "energy-transition", label: "Energy transition" },
  { value: "renewables", label: "Renewables" },
  { value: "innovation", label: "Technology R&D" },
];

export const INSTRUMENT_TYPE_TAXONOMY: { value: string; label: string }[] = [
  { value: "primary-legislation", label: "Primary legislation" },
  { value: "secondary-legislation", label: "Secondary legislation" },
  { value: "guidance", label: "Guidance" },
  { value: "consultation", label: "Consultation" },
  { value: "enforcement", label: "Enforcement" },
  { value: "standard", label: "Standard" },
  { value: "proposed-rule", label: "Proposed rule" },
  { value: "final-rule", label: "Final rule" },
  { value: "policy", label: "Policy" },
  { value: "notice", label: "Notice" },
];

/**
 * Coarse "source" grouping over instrument_type, used by the Search page's
 * source picker. Three buckets the corpus naturally splits into:
 *   - News      → instrument_type 'notice' (regulator press releases)
 *   - Policies  → instrument_type 'policy'  (e.g. the IEA policies database)
 *   - Regulations → everything else (the eight legislative/rule types)
 *
 * "Regulations" is defined as the COMPLEMENT of the two tagged buckets, so any
 * future instrument type added to INSTRUMENT_TYPE_TAXONOMY automatically counts
 * as a regulation unless it's explicitly news/policy.
 */
export const NEWS_INSTRUMENT_TYPES = ["notice"] as const;
export const POLICY_INSTRUMENT_TYPES = ["policy"] as const;
export const REGULATION_INSTRUMENT_TYPES = INSTRUMENT_TYPE_TAXONOMY.map((t) => t.value).filter(
  (v) => !NEWS_INSTRUMENT_TYPES.includes(v as never) && !POLICY_INSTRUMENT_TYPES.includes(v as never),
);

export const SOURCE_TAXONOMY: {
  value: string;
  label: string;
  description: string;
  types: readonly string[];
}[] = [
  {
    value: "regulations",
    label: "Regulations",
    description: "Laws, rules, guidance, standards & enforcement",
    types: REGULATION_INSTRUMENT_TYPES,
  },
  {
    value: "policies",
    label: "Policies",
    description: "Policy database entries (e.g. IEA)",
    types: POLICY_INSTRUMENT_TYPES,
  },
  {
    value: "news",
    label: "News",
    description: "Regulator press releases & notices",
    types: NEWS_INSTRUMENT_TYPES,
  },
];

/** Sources searched by default before the user touches the picker. */
export const DEFAULT_SOURCES = ["regulations"] as const;

/**
 * Parse the `sources` URL param into a list of selected source values.
 * Absent → default (regulations only). The literal "none" → empty (the user
 * unchecked everything → match nothing).
 */
export function parseSources(param: string | undefined | null): string[] {
  if (param === undefined || param === null) return [...DEFAULT_SOURCES];
  if (param === "none" || param.trim() === "") return [];
  const valid = new Set(SOURCE_TAXONOMY.map((s) => s.value));
  return param
    .split(",")
    .map((s) => s.trim())
    .filter((s) => valid.has(s));
}

/** Serialise selected sources back to a URL param value ("none" when empty). */
export function serializeSources(sources: string[]): string {
  return sources.length === 0 ? "none" : sources.join(",");
}

/** Parse a comma-separated multi-select facet param into a list of values. */
export function parseCsv(param: string | undefined | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The set of instrument_type values covered by the selected sources. */
export function instrumentTypesForSources(sources: string[]): string[] {
  const set = new Set<string>();
  for (const s of sources) {
    SOURCE_TAXONOMY.find((x) => x.value === s)?.types.forEach((t) => set.add(t));
  }
  return [...set];
}

export const STATUS_TAXONOMY: { value: string; label: string }[] = [
  { value: "in-force", label: "In force" },
  { value: "amended", label: "Amended" },
  { value: "proposed", label: "Proposed" },
  { value: "consultation-open", label: "Consultation open" },
  { value: "consultation-closed", label: "Consultation closed" },
  { value: "superseded", label: "Superseded" },
  { value: "repealed", label: "Repealed" },
];

export function topicLabel(value: string): string {
  const known = TOPIC_TAXONOMY.find((t) => t.value === value)?.label;
  if (known) return known;
  // Humanise an uncatalogued slug: "gcc-alignment" → "Gcc alignment".
  const spaced = value.replace(/[-_]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : value;
}
export function instrumentTypeLabel(value: string): string {
  return INSTRUMENT_TYPE_TAXONOMY.find((t) => t.value === value)?.label ?? value;
}
export function statusLabel(value: string): string {
  return STATUS_TAXONOMY.find((t) => t.value === value)?.label ?? value;
}
