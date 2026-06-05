import { createClient } from "./supabase/server";

/**
 * Server-side data access for the Browser + Detail surfaces. Every helper
 * runs against the regwatch schema via the SSR client and is governed by
 * the corpus-public RLS policies — anonymous visitors and signed-in users
 * see the same rows, no auth required.
 *
 * NOTE: this module imports next/headers (via the SSR Supabase client) and
 * therefore cannot be imported from client components. For taxonomy constants
 * and label helpers usable from client components, import from ./taxonomy.
 */

export interface JurisdictionSummary {
  jurisdiction_code: string;
  jurisdiction_name: string;
  region: string;
  regulator_count: number;
  item_count: number;
  recent_item_count: number;
}

export interface RegulationListItem {
  id: string;
  citation: string;
  slug: string;
  title: string;
  summary: string | null;
  instrument_type: string;
  status: string;
  effective_date: string | null;
  last_changed_at: string;
  jurisdiction_code: string;
  topics: string[];
  regulator: {
    slug: string;
    name: string;
    short_name: string | null;
  };
}

export interface RegulationDetail extends RegulationListItem {
  proposed_date: string | null;
  consultation_closes_at: string | null;
  published_at: string;
  source_url: string;
  body_text: string | null;
  body_html: string | null;
  substances_cas: string[];
  naics_codes: string[];
  isic_codes: string[];
  nace_codes: string[];
  regulator: {
    slug: string;
    name: string;
    short_name: string | null;
    jurisdiction_name: string;
    canonical_url: string | null;
    description: string | null;
  };
}

export interface BrowseFilters {
  jurisdiction?: string;
  /** Regulator slug (e.g., "us-epa", "eu-dg-clima"). */
  regulator?: string;
  topic?: string;
  instrument_type?: string;
  status?: string;
  q?: string;
  /** When true, excludes items with instrument_type='notice' (press releases). */
  hideNews?: boolean;
}

const ITEM_LIST_COLUMNS = `
  id, citation, slug, title, summary, instrument_type, status,
  effective_date, last_changed_at, jurisdiction_code, topics,
  regulator:regulators!inner ( slug, name, short_name )
`;

const ITEM_DETAIL_COLUMNS = `
  id, citation, slug, title, summary, instrument_type, status,
  effective_date, proposed_date, consultation_closes_at, published_at,
  last_changed_at, source_url, body_text, body_html, jurisdiction_code,
  topics, substances_cas, naics_codes, isic_codes, nace_codes,
  regulator:regulators!inner (
    slug, name, short_name, jurisdiction_name, canonical_url, description
  )
`;

export async function getJurisdictionSummaries(): Promise<JurisdictionSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jurisdiction_summary")
    .select("*")
    .order("item_count", { ascending: false });

  if (error) {
    console.error("[regwatch] jurisdiction_summary error:", error);
    return [];
  }
  return (data ?? []) as JurisdictionSummary[];
}

export async function listRegulations(
  filters: BrowseFilters,
  limit = 50,
): Promise<RegulationListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("regulatory_items")
    .select(ITEM_LIST_COLUMNS)
    .order("last_changed_at", { ascending: false })
    .limit(limit);

  if (filters.jurisdiction) {
    query = query.eq("jurisdiction_code", filters.jurisdiction.toUpperCase());
  }
  if (filters.regulator) {
    query = query.eq("regulator.slug", filters.regulator);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.instrument_type) {
    query = query.eq("instrument_type", filters.instrument_type);
  }
  if (filters.hideNews) {
    query = query.neq("instrument_type", "notice");
  }
  if (filters.topic) {
    query = query.contains("topics", [filters.topic]);
  }
  if (filters.q) {
    // websearch_to_tsquery is the most forgiving FTS parser — handles plain
    // text queries without users having to know boolean syntax.
    query = query.textSearch("body_search", filters.q, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error } = await query;
  if (error) {
    console.error("[regwatch] listRegulations error:", error);
    return [];
  }
  // Supabase types a `!inner` join target as an array; flatten for the view-model.
  return (data ?? []).map((row) => ({
    ...row,
    regulator: Array.isArray(row.regulator) ? row.regulator[0] : row.regulator,
  })) as RegulationListItem[];
}

export async function getRegulation(
  jurisdiction: string,
  slug: string,
): Promise<RegulationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regulatory_items")
    .select(ITEM_DETAIL_COLUMNS)
    .eq("jurisdiction_code", jurisdiction.toUpperCase())
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[regwatch] getRegulation error:", error);
    return null;
  }
  if (!data) return null;

  const regulator = Array.isArray(data.regulator) ? data.regulator[0] : data.regulator;
  return { ...data, regulator } as RegulationDetail;
}

/**
 * Full regulator catalog with item counts. Drives the Regulators index page,
 * the Browse "Regulator" filter dropdown, and any other surface that needs a
 * complete list of monitored regulators.
 *
 * We do the item-count aggregation client-side instead of via a SQL view to
 * avoid another migration; the regulator catalog is small (~30 rows) and the
 * item count grows linearly with corpus size, so the join is cheap.
 */
export interface RegulatorSummary {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
  jurisdiction_name: string;
  region: string;
  regulator_type: string;
  canonical_url: string | null;
  description: string | null;
  topic_domains: string[];
  item_count: number;
  recent_item_count: number;
}

export async function listRegulators(): Promise<RegulatorSummary[]> {
  const supabase = await createClient();
  const { data: regulators, error: regError } = await supabase
    .from("regulators")
    .select(
      "id, slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains",
    )
    .eq("is_active", true)
    .order("region", { ascending: true })
    .order("name", { ascending: true });

  if (regError || !regulators) {
    console.error("[regwatch] listRegulators error:", regError);
    return [];
  }

  // Pull item counts in two queries (total + recent-30d). Cheaper than running
  // count(*) per-regulator round trips.
  const { data: itemRows, error: itemErr } = await supabase
    .from("regulatory_items")
    .select("regulator_id, last_changed_at");

  if (itemErr) {
    return regulators.map((r) => shapeRegulator(r, 0, 0));
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const recentCutoff = Date.now() - 30 * dayMs;
  const total = new Map<string, number>();
  const recent = new Map<string, number>();
  for (const row of itemRows ?? []) {
    const rid = row.regulator_id as string;
    total.set(rid, (total.get(rid) ?? 0) + 1);
    const changed = new Date(row.last_changed_at as string).getTime();
    if (isFinite(changed) && changed >= recentCutoff) {
      recent.set(rid, (recent.get(rid) ?? 0) + 1);
    }
  }

  return regulators.map((r) =>
    shapeRegulator(r, total.get(r.id) ?? 0, recent.get(r.id) ?? 0),
  );
}

function shapeRegulator(
  r: Record<string, unknown>,
  total: number,
  recent30d: number,
): RegulatorSummary {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    short_name: (r.short_name as string) ?? null,
    jurisdiction_code: r.jurisdiction_code as string,
    jurisdiction_name: r.jurisdiction_name as string,
    region: r.region as string,
    regulator_type: r.regulator_type as string,
    canonical_url: (r.canonical_url as string) ?? null,
    description: (r.description as string) ?? null,
    topic_domains: ((r.topic_domains as string[]) ?? []) as string[],
    item_count: total,
    recent_item_count: recent30d,
  };
}

export async function getRegulatorBySlug(
  slug: string,
): Promise<RegulatorSummary | null> {
  const all = await listRegulators();
  return all.find((r) => r.slug === slug) ?? null;
}

export async function listRegulationsByRegulator(
  regulatorSlug: string,
  limit = 100,
): Promise<RegulationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regulatory_items")
    .select(ITEM_LIST_COLUMNS)
    .eq("regulator.slug", regulatorSlug)
    .order("last_changed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[regwatch] listRegulationsByRegulator error:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    regulator: Array.isArray(row.regulator) ? row.regulator[0] : row.regulator,
  })) as RegulationListItem[];
}

export async function getRelatedRegulations(
  jurisdictionCode: string,
  excludeId: string,
  topics: string[],
  limit = 5,
): Promise<RegulationListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("regulatory_items")
    .select(ITEM_LIST_COLUMNS)
    .eq("jurisdiction_code", jurisdictionCode)
    .neq("id", excludeId)
    .order("last_changed_at", { ascending: false })
    .limit(limit);

  if (topics.length > 0) {
    query = query.overlaps("topics", topics);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[regwatch] getRelatedRegulations error:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...row,
    regulator: Array.isArray(row.regulator) ? row.regulator[0] : row.regulator,
  })) as RegulationListItem[];
}

