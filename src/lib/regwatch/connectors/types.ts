/**
 * Connector contract.
 *
 * Each connector knows how to fetch fresh regulatory items from one
 * upstream source (API or scraped portal) and emit a list of
 * normalised items the orchestrator persists via the service-role
 * Supabase client. Connectors are stateless and idempotent — they look
 * back N days from `now`, and the orchestrator upserts by
 * (regulator_id, citation).
 */

export type InstrumentType =
  | "primary-legislation"
  | "secondary-legislation"
  | "guidance"
  | "consultation"
  | "enforcement"
  | "standard"
  | "proposed-rule"
  | "final-rule"
  | "policy"
  | "notice";

export type ItemStatus =
  | "proposed"
  | "in-force"
  | "amended"
  | "superseded"
  | "repealed"
  | "consultation-open"
  | "consultation-closed";

export interface NormalisedItem {
  /** Stable regulator slug already present in regwatch.regulators. */
  regulator_slug: string;
  /** Regulator-native citation (e.g. "40 CFR 261.4", "CELEX:32023R0956"). */
  citation: string;
  /** URL-safe form of the citation; used as the second URL segment. */
  slug: string;
  title: string;
  instrument_type: InstrumentType;
  status: ItemStatus;
  effective_date: string | null;        // ISO date
  proposed_date: string | null;         // ISO date
  consultation_closes_at: string | null;// ISO timestamp
  published_at: string;                 // ISO timestamp
  last_changed_at: string;              // ISO timestamp
  source_url: string;
  summary: string | null;
  body_text: string | null;
  body_html: string | null;
  jurisdiction_code: string;
  /** Connector may pre-populate these; enrichment can refine later. */
  topics?: string[];
  substances_cas?: string[];
  naics_codes?: string[];
}

export interface ConnectorRunContext {
  lookbackDays: number;
  now: Date;
  /** When false, the connector logs what it would do but doesn't fetch network. */
  dryRun?: boolean;
}

export interface ConnectorResult {
  source: string;
  fetched: number;
  errors: string[];
  items: NormalisedItem[];
}

export interface Connector {
  /** Stable connector identifier. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Regulator slug the items belong to. */
  regulator_slug: string;
  /** Discovers + fetches items published in the last `ctx.lookbackDays` days. */
  run(ctx: ConnectorRunContext): Promise<ConnectorResult>;
  /**
   * Optional. Returns the publisher's table-of-contents as a tree of
   * nodes, used by the regwatch-hierarchy cron to populate
   * regwatch.regulatory_sections — the data behind the eCFR-style
   * browse view. Connectors without a real ToC should omit this; the
   * browse UI falls back to a flat "All regulations from {publisher}"
   * pseudo-root for those publishers.
   */
  buildHierarchy?(ctx: ConnectorRunContext): Promise<HierarchyNode[]>;
}

/**
 * One node in a publisher's regulatory table-of-contents. Children
 * nest recursively. The `path` is the canonical ltree coordinate used
 * as the dedupe key in regwatch.regulatory_sections — keep it stable
 * across reruns (don't use auto-incrementing IDs).
 *
 *   path: 'us.cfr.title_1'             level: 1  identifier: 'Title 1'
 *   path: 'us.cfr.title_1.chapter_i'   level: 2  identifier: 'Chapter I'
 *
 * Leaf nodes that represent the actual cited regulation set `citation`
 * to the matching `regulatory_items.citation` value so the browse leaf
 * can link to the regulation detail page.
 */
export interface HierarchyNode {
  path: string;
  level: number;
  level_label: string;
  identifier: string;
  title: string | null;
  citation: string | null;
  source_url: string | null;
  children: HierarchyNode[];
}

export interface HierarchySyncResult {
  source: string;
  upserted: number;
  errors: string[];
}

export function citationSlug(citation: string): string {
  return citation
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
