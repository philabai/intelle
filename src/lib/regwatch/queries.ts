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
  topic?: string;
  instrument_type?: string;
  status?: string;
  q?: string;
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
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.instrument_type) {
    query = query.eq("instrument_type", filters.instrument_type);
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

