import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { embedOne, isVoyageConfigured, toPgVectorLiteral } from "./voyage";
import { severityFor, type Severity } from "./match";

/**
 * Semantic-only matching lane.
 *
 * The token-overlap scorer in match.ts only fires when a regulation's
 * topics/NAICS/substances/regulators/jurisdiction literally overlap with the
 * footprint. Vector retrieval surfaces items the rules-based scorer misses
 * because the regulator's vocabulary doesn't match the footprint's vocabulary
 * exactly (e.g. footprint says "ammonia" but the regulation calls it
 * "anhydrous NH3").
 *
 * Conservative integration: we DO NOT replace token-overlap scoring. We only
 * surface "fresh" items (items the rules-based pass found nothing for in this
 * footprint) and cap their severity to "normal" — semantic matches without
 * any explicit overlap evidence are softer signal. The user still sees them
 * but they don't fire critical alerts.
 *
 * Per call: one Voyage embed + one RPC. Cheap relative to the per-pair Node
 * loop over the whole corpus.
 */

const SEMANTIC_TOP_K = 30;
/** Min blended_score from the RPC to consider — keeps junk out of the Feed. */
const SEMANTIC_MIN_VECTOR = 0.55;
/** Convert vector_score in [0,1] to a 0-100 RegWatch score. Cap at 55 so the
 *  semantic-only severity tops out at "normal" (60 threshold = "high"). */
const SEMANTIC_SCORE_SCALE = 55;

export interface SemanticFootprint {
  id: string;
  organization_id: string;
  geographies: string[];
  activities_naics: string[];
  monitored_regulator_slugs: string[];
  monitored_topics: string[];
  substances_cas: string[];
}

export interface SemanticMatchUpsert {
  organization_id: string;
  footprint_id: string;
  regulatory_item_id: string;
  score: number;
  severity: Severity;
  match_reason: Record<string, unknown>;
  matched_at: string;
}

/**
 * Builds a stable query-text from a footprint. Order: topics first (highest
 * signal), then activities, regulators, substances. We do NOT include
 * geography codes — they're poor query-text and pollute the embedding.
 */
function footprintToQueryText(fp: SemanticFootprint): string {
  const parts: string[] = [];
  if (fp.monitored_topics.length > 0) {
    parts.push(`Topics of interest: ${fp.monitored_topics.join(", ")}`);
  }
  if (fp.activities_naics.length > 0) {
    parts.push(`Industrial activities (NAICS): ${fp.activities_naics.join(", ")}`);
  }
  if (fp.substances_cas.length > 0) {
    parts.push(`Substances tracked (CAS): ${fp.substances_cas.join(", ")}`);
  }
  if (fp.monitored_regulator_slugs.length > 0) {
    parts.push(`Regulators monitored: ${fp.monitored_regulator_slugs.join(", ")}`);
  }
  return parts.join("\n").slice(0, 4000);
}

export interface SemanticMatchResult {
  considered_footprints: number;
  skipped_unconfigured: number;
  semantic_hits: number;
  fresh_matches: number;
  errors: string[];
}

/**
 * For each configured footprint:
 *   1. Embed its query text via Voyage.
 *   2. Call match_regulatory_items RPC (alpha=1 = pure vector).
 *   3. Drop hits whose pair already has a row in footprint_matches
 *      (token-overlap scorer surfaced them; nothing to add).
 *   4. Return the rest as semantic-only upsert candidates with capped
 *      severity.
 *
 * No I/O on the upsert — caller (match-pipeline) does it as part of its
 * existing chunked upsert loop.
 */
export async function computeSemanticMatches(
  footprints: SemanticFootprint[],
): Promise<{ rows: SemanticMatchUpsert[]; stats: SemanticMatchResult }> {
  const stats: SemanticMatchResult = {
    considered_footprints: 0,
    skipped_unconfigured: 0,
    semantic_hits: 0,
    fresh_matches: 0,
    errors: [],
  };
  const rows: SemanticMatchUpsert[] = [];

  if (!isVoyageConfigured()) {
    // Silently no-op — semantic lane is opt-in via env config.
    return { rows, stats };
  }

  const svc = createServiceClient();
  const now = new Date().toISOString();

  for (const fp of footprints) {
    stats.considered_footprints += 1;
    const text = footprintToQueryText(fp);
    if (text.length === 0) {
      stats.skipped_unconfigured += 1;
      continue;
    }

    let qvec: number[];
    try {
      qvec = await embedOne(text, { inputType: "query" });
    } catch (e) {
      stats.errors.push(
        `embed footprint ${fp.id}: ${(e as Error).message}`,
      );
      continue;
    }

    const { data: hits, error: rpcErr } = await svc.rpc(
      "match_regulatory_items",
      {
        query_embedding: toPgVectorLiteral(qvec),
        query_text: "", // pure vector — let the RPC degrade FTS to 0
        match_limit: SEMANTIC_TOP_K,
        alpha: 1.0,
      },
    );
    if (rpcErr) {
      stats.errors.push(`rpc footprint ${fp.id}: ${rpcErr.message}`);
      continue;
    }
    if (!hits || hits.length === 0) continue;
    stats.semantic_hits += hits.length;

    const itemIds = (hits as Array<{ id: string; vector_score: number }>)
      .filter((h) => h.vector_score >= SEMANTIC_MIN_VECTOR)
      .map((h) => h.id);
    if (itemIds.length === 0) continue;

    // Find which (footprint, item) pairs already exist so we only surface
    // fresh ones. RLS-bypass via service-role.
    const { data: existing } = await svc
      .from("footprint_matches")
      .select("regulatory_item_id")
      .eq("footprint_id", fp.id)
      .in("regulatory_item_id", itemIds);
    const existingItemIds = new Set<string>(
      (existing ?? []).map((r) => r.regulatory_item_id as string),
    );

    for (const hit of hits as Array<{ id: string; vector_score: number }>) {
      if (hit.vector_score < SEMANTIC_MIN_VECTOR) continue;
      if (existingItemIds.has(hit.id)) continue;

      const score = Math.min(
        Math.round(hit.vector_score * SEMANTIC_SCORE_SCALE * 100) / 100,
        SEMANTIC_SCORE_SCALE,
      );
      rows.push({
        organization_id: fp.organization_id,
        footprint_id: fp.id,
        regulatory_item_id: hit.id,
        score,
        severity: severityFor(score),
        match_reason: {
          geo: { matched: false, via: null },
          regulator: { matched: false, via: null },
          topic: { matched: [], score: 0 },
          naics: { matched: [], score: 0 },
          substance: { matched: [], score: 0 },
          semantic: { matched: true, vector_score: hit.vector_score },
        },
        matched_at: now,
      });
      stats.fresh_matches += 1;
    }
  }

  return { rows, stats };
}
