import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { scoreItem, type FootprintInput, type ItemInput } from "./match";

/**
 * Matcher orchestrator. For each configured footprint, scores every
 * regulatory_item in the corpus and upserts a footprint_matches row when the
 * score clears MIN_PERSIST_SCORE.
 *
 * Bypasses RLS via the service-role client because the pipeline writes on
 * behalf of every org. User-facing reads from /regwatch/feed go through the
 * SSR client, which RLS scopes to the calling org's matches.
 *
 * Idempotent — the (footprint_id, regulatory_item_id) unique constraint drives
 * upsert. Re-runs after enrichment or footprint changes silently update
 * scores in place.
 */

export interface MatchPipelineOptions {
  /** Restrict to one footprint (e.g. after a user saved theirs). */
  footprintId?: string;
  /** Restrict to items ingested in the last N days. Useful for incremental runs. */
  itemsSinceDays?: number;
}

export interface MatchPipelineResult {
  footprints_considered: number;
  items_considered: number;
  pairs_scored: number;
  matches_upserted: number;
  errors: string[];
  duration_ms: number;
}

const UPSERT_CHUNK = 100;

export async function runMatchPipeline(
  options: MatchPipelineOptions = {},
): Promise<MatchPipelineResult> {
  const started = Date.now();
  const result: MatchPipelineResult = {
    footprints_considered: 0,
    items_considered: 0,
    pairs_scored: 0,
    matches_upserted: 0,
    errors: [],
    duration_ms: 0,
  };

  const supabase = createServiceClient();

  // 1. Pull footprints (optionally narrowed to one).
  let footprintsQuery = supabase
    .from("operations_footprints")
    .select(
      "id, organization_id, geographies, activities_naics, monitored_regulator_slugs, monitored_topics, substances_cas",
    );
  if (options.footprintId) {
    footprintsQuery = footprintsQuery.eq("id", options.footprintId);
  }
  const { data: footprints, error: fpError } = await footprintsQuery;
  if (fpError) {
    result.errors.push(`footprint query: ${fpError.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  if (!footprints || footprints.length === 0) {
    result.duration_ms = Date.now() - started;
    return result;
  }
  result.footprints_considered = footprints.length;

  // 2. Pull candidate items. The corpus is globally readable so a single query
  // covers all footprints. For incremental cron runs we cap by ingested_at.
  let itemsQuery = supabase
    .from("regulatory_items")
    .select(
      `id, jurisdiction_code, topics, naics_codes, substances_cas, regulator_id,
       regulator:regulators!inner ( slug )`,
    );
  if (options.itemsSinceDays && options.itemsSinceDays > 0) {
    const since = new Date(
      Date.now() - options.itemsSinceDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    itemsQuery = itemsQuery.gte("ingested_at", since);
  }
  const { data: rawItems, error: itemsError } = await itemsQuery;
  if (itemsError) {
    result.errors.push(`item query: ${itemsError.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  const items = (rawItems ?? []).map((r) => {
    const reg = Array.isArray(r.regulator) ? r.regulator[0] : r.regulator;
    return {
      id: r.id as string,
      regulator_id: r.regulator_id as string,
      jurisdiction_code: r.jurisdiction_code as string,
      topics: (r.topics as string[]) ?? [],
      naics_codes: (r.naics_codes as string[]) ?? [],
      substances_cas: (r.substances_cas as string[]) ?? [],
      regulator_slug: (reg?.slug as string) ?? "",
    };
  });
  result.items_considered = items.length;

  // 3. Score every (footprint, item) pair and accumulate upsert rows.
  type MatchRow = {
    organization_id: string;
    footprint_id: string;
    regulatory_item_id: string;
    score: number;
    severity: string;
    match_reason: Record<string, unknown>;
    matched_at: string;
  };
  const upsertRows: MatchRow[] = [];
  const now = new Date().toISOString();

  for (const footprint of footprints) {
    const fpInput: FootprintInput = {
      geographies: footprint.geographies ?? [],
      activities_naics: footprint.activities_naics ?? [],
      monitored_regulator_slugs: footprint.monitored_regulator_slugs ?? [],
      monitored_topics: footprint.monitored_topics ?? [],
      substances_cas: footprint.substances_cas ?? [],
    };
    // Skip footprints that have nothing configured — every pair would score 0
    // and we'd waste a write. Match pipeline runs again after the user saves.
    const isEmpty =
      fpInput.geographies.length === 0 &&
      fpInput.activities_naics.length === 0 &&
      fpInput.monitored_regulator_slugs.length === 0 &&
      fpInput.monitored_topics.length === 0 &&
      fpInput.substances_cas.length === 0;
    if (isEmpty) continue;

    for (const item of items) {
      result.pairs_scored += 1;
      const itemInput: ItemInput = {
        jurisdiction_code: item.jurisdiction_code,
        topics: item.topics,
        naics_codes: item.naics_codes,
        substances_cas: item.substances_cas,
        regulator_slug: item.regulator_slug,
      };
      const scored = scoreItem(fpInput, itemInput);
      if (!scored) continue;
      upsertRows.push({
        organization_id: footprint.organization_id as string,
        footprint_id: footprint.id as string,
        regulatory_item_id: item.id,
        score: scored.score,
        severity: scored.severity,
        match_reason: scored.reason as unknown as Record<string, unknown>,
        matched_at: now,
      });
    }
  }

  // 4. Chunked upsert. The (footprint_id, regulatory_item_id) unique
  // constraint drives the merge.
  for (let i = 0; i < upsertRows.length; i += UPSERT_CHUNK) {
    const chunk = upsertRows.slice(i, i + UPSERT_CHUNK);
    const { error, count } = await supabase
      .from("footprint_matches")
      .upsert(chunk, {
        onConflict: "footprint_id,regulatory_item_id",
        ignoreDuplicates: false,
        count: "exact",
      });
    if (error) {
      result.errors.push(`upsert chunk @${i}: ${error.message}`);
      continue;
    }
    result.matches_upserted += count ?? chunk.length;
  }

  result.duration_ms = Date.now() - started;
  return result;
}
