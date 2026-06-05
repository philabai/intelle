"use server";

import { z } from "zod";
import { createClient } from "./supabase/server";
import { listRegulationsHybrid } from "./queries";

/**
 * Server action that powers the in-app regulation autocomplete used by
 * - LinkRegulationForm (linking a doc to a reg)
 * - CreateObligationForm (creating a new obligation)
 *
 * Lookup pipeline (most-specific to most-recall):
 *   1. UUID paste → exact row
 *   2. Hybrid retrieval (Voyage vector + FTS) via the RPC
 *   3. Metadata fallback: ILIKE on citation/title/summary OR topic membership
 *      → catches items where the term lives in the topics[] taxonomy but
 *        NOT in the FTS-indexed text (e.g. items tagged 'methane' whose
 *        body uses "CH4" instead) AND covers the no-Voyage-yet case.
 *   4. Merge + dedupe, preserve hybrid ranking, then metadata results.
 *
 * Empty/short query: surface a "Suggested" list of in-force regulations
 * sorted by most-recently-changed, EXCLUDING instrument_type='notice'
 * (press releases). The previous version surfaced press releases because
 * they have the highest change cadence — not what an admin attaching a
 * regulation actually wants.
 *
 * Each result carries `instrumentType` so the picker UI can badge notices
 * differently from primary legislation.
 */

export interface RegulationPickerResult {
  id: string;
  citation: string;
  title: string;
  jurisdictionCode: string;
  regulatorName: string;
  status: string;
  instrumentType: string | null;
  /** True for press releases / news items. Surfaced so the UI can de-emphasise. */
  isNotice: boolean;
}

const inputSchema = z.object({
  query: z.string().trim().min(0).max(200),
  limit: z.number().int().min(1).max(50).default(15),
  /** When true, includes press releases / news items in results. */
  includeNotices: z.boolean().default(false),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTICE_INSTRUMENT_TYPES = ["notice"] as const;

interface RawRow {
  id: string;
  citation: string;
  title: string;
  jurisdiction_code: string;
  status: string;
  instrument_type: string | null;
  regulator:
    | { name: string; short_name: string | null }
    | { name: string; short_name: string | null }[]
    | null;
}

function mapRow(row: RawRow): RegulationPickerResult {
  const reg = Array.isArray(row.regulator) ? row.regulator[0] : row.regulator;
  return {
    id: row.id,
    citation: row.citation,
    title: row.title,
    jurisdictionCode: row.jurisdiction_code,
    status: row.status,
    instrumentType: row.instrument_type ?? null,
    isNotice: row.instrument_type === "notice",
    regulatorName:
      reg?.short_name ??
      reg?.name ??
      "Unknown regulator",
  };
}

const SELECT_COLS = `id, citation, title, jurisdiction_code, status, instrument_type,
  regulator:regulators!inner ( name, short_name )`;

export async function searchRegulationsForPicker(
  input: unknown,
): Promise<RegulationPickerResult[]> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const q = parsed.data.query;
  const limit = parsed.data.limit;
  const includeNotices = parsed.data.includeNotices;

  // 1. UUID paste — exact row.
  if (UUID_RE.test(q)) {
    const { data } = await supabase
      .from("regulatory_items")
      .select(SELECT_COLS)
      .eq("id", q)
      .limit(1)
      .maybeSingle();
    return data ? [mapRow(data as unknown as RawRow)] : [];
  }

  // 2. Empty / very-short query → "Suggested" browse.
  //    Filter out notices unless explicitly requested. Pulls more rows than
  //    the limit so we can prefer in-force items, then trim.
  if (q.length < 2) {
    let suggestion = supabase
      .from("regulatory_items")
      .select(SELECT_COLS)
      .order("last_changed_at", { ascending: false })
      .limit(limit * 2);
    if (!includeNotices) {
      suggestion = suggestion.not(
        "instrument_type",
        "in",
        `(${NOTICE_INSTRUMENT_TYPES.join(",")})`,
      );
    }
    const { data } = await suggestion;
    const rows = (data ?? []).map((r) => mapRow(r as unknown as RawRow));
    // Prefer status=in-force, then proposed, then everything else.
    const STATUS_RANK: Record<string, number> = {
      "in-force": 0,
      proposed: 1,
      amended: 2,
      "consultation-open": 3,
    };
    rows.sort(
      (a, b) =>
        (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99),
    );
    return rows.slice(0, limit);
  }

  // 3 + 4. Real search. Run hybrid + metadata in parallel, merge.
  const [hybridHits, metadataHits] = await Promise.all([
    runHybrid(q, limit),
    runMetadataFallback(supabase, q, limit, includeNotices),
  ]);

  const merged = new Map<string, RegulationPickerResult>();
  for (const h of hybridHits) {
    if (!includeNotices && h.isNotice) continue;
    merged.set(h.id, h);
  }
  for (const h of metadataHits) {
    if (merged.has(h.id)) continue;
    merged.set(h.id, h);
  }

  // If the user explicitly opted into notices, push notices to the bottom
  // so the more-likely-relevant primary instruments come first.
  const out = Array.from(merged.values());
  out.sort((a, b) => Number(a.isNotice) - Number(b.isNotice));
  return out.slice(0, limit);
}

async function runHybrid(
  query: string,
  limit: number,
): Promise<RegulationPickerResult[]> {
  try {
    const hits = await listRegulationsHybrid(query, limit);
    return hits.map((h) => ({
      id: h.id,
      citation: h.citation,
      title: h.title,
      jurisdictionCode: h.jurisdiction_code,
      status: h.status,
      instrumentType: (h as unknown as { instrument_type: string | null })
        .instrument_type ?? null,
      isNotice:
        ((h as unknown as { instrument_type: string | null }).instrument_type ??
          null) === "notice",
      regulatorName: h.regulator.short_name ?? h.regulator.name,
    }));
  } catch (e) {
    console.error("[regwatch] picker hybrid failed:", e);
    return [];
  }
}

/**
 * Metadata-side fallback for the picker. Covers two cases the hybrid lane
 * can miss:
 *   - the query term lives in the `topics[]` taxonomy (not indexed by
 *     body_search) — e.g. items tagged 'methane' whose body uses 'CH4';
 *   - Voyage embeddings haven't been backfilled yet, so the vector lane
 *     is dead and FTS alone misses paraphrases.
 *
 * Uses ILIKE so it's case-insensitive and doesn't depend on Postgres FTS
 * stemming. Limited to the picker's typical case sizes — not a substitute
 * for the search page.
 */
async function runMetadataFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  limit: number,
  includeNotices: boolean,
): Promise<RegulationPickerResult[]> {
  const term = `%${query.replace(/[%_]/g, "\\$&")}%`;
  const lower = query.toLowerCase().trim();

  // .or() takes a Postgres OR expression; we OR across title/citation/summary
  // ILIKE + a topic-array containment check.
  let base = supabase
    .from("regulatory_items")
    .select(SELECT_COLS)
    .or(
      [
        `title.ilike.${term}`,
        `citation.ilike.${term}`,
        `summary.ilike.${term}`,
        // PostgREST array-contains via `topics=cs.{value}` syntax — encoded
        // in .or() means topics contains [lower] as a literal element.
        `topics.cs.{${lower}}`,
      ].join(","),
    )
    .limit(limit * 2);
  if (!includeNotices) {
    base = base.not(
      "instrument_type",
      "in",
      `(${NOTICE_INSTRUMENT_TYPES.join(",")})`,
    );
  }
  const { data, error } = await base;
  if (error) {
    console.error("[regwatch] picker metadata fallback:", error);
    return [];
  }
  return (data ?? []).map((r) => mapRow(r as unknown as RawRow));
}
