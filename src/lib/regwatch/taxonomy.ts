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
  { value: "notice", label: "Notice" },
];

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
