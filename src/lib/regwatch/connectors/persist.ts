import { createServiceClient } from "@/lib/regwatch/supabase/service";
import type { NormalisedItem } from "./types";

/**
 * Upserts a batch of connector-emitted items into regwatch.regulatory_items.
 * Uses the service-role client to bypass RLS (corpus mutations aren't allowed
 * for authenticated users — only the pipeline writes). Resolves regulator
 * UUIDs by slug first, then upserts in chunks of 50.
 */
export interface PersistResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function persistItems(items: NormalisedItem[]): Promise<PersistResult> {
  const result: PersistResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  if (items.length === 0) return result;

  const supabase = createServiceClient();

  // Resolve regulator slugs → uuids in one round-trip.
  const slugs = Array.from(new Set(items.map((i) => i.regulator_slug)));
  const { data: regs, error: regError } = await supabase
    .from("regulators")
    .select("id, slug")
    .in("slug", slugs);

  if (regError) {
    result.errors.push(`regulator lookup: ${regError.message}`);
    return result;
  }

  const slugToId = new Map<string, string>(regs?.map((r) => [r.slug, r.id]) ?? []);

  type ItemRow = {
    regulator_id: string;
    citation: string;
    slug: string;
    title: string;
    instrument_type: string;
    status: string;
    effective_date: string | null;
    proposed_date: string | null;
    consultation_closes_at: string | null;
    published_at: string;
    last_changed_at: string;
    source_url: string;
    summary: string | null;
    body_text: string | null;
    body_html: string | null;
    jurisdiction_code: string;
    topics: string[];
    substances_cas: string[];
    naics_codes: string[];
    enrichment_status: string;
  };

  const rows: ItemRow[] = [];
  for (const item of items) {
    const regulator_id = slugToId.get(item.regulator_slug);
    if (!regulator_id) {
      result.skipped += 1;
      result.errors.push(`unknown regulator slug: ${item.regulator_slug}`);
      continue;
    }
    rows.push({
      regulator_id,
      citation: item.citation,
      slug: item.slug,
      title: item.title,
      instrument_type: item.instrument_type,
      status: item.status,
      effective_date: item.effective_date,
      proposed_date: item.proposed_date,
      consultation_closes_at: item.consultation_closes_at,
      published_at: item.published_at,
      last_changed_at: item.last_changed_at,
      source_url: item.source_url,
      summary: item.summary,
      body_text: item.body_text,
      body_html: item.body_html,
      jurisdiction_code: item.jurisdiction_code,
      topics: item.topics ?? [],
      substances_cas: item.substances_cas ?? [],
      naics_codes: item.naics_codes ?? [],
      enrichment_status: "pending",
    });
  }

  // Chunked upsert. The unique constraint on (regulator_id, citation) drives
  // the conflict target. We let Postgres do the merge — no per-row read.
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from("regulatory_items")
      .upsert(chunk, {
        onConflict: "regulator_id,citation",
        ignoreDuplicates: false,
        count: "exact",
      });
    if (error) {
      result.errors.push(`upsert chunk @${i}: ${error.message}`);
      continue;
    }
    // count is the number of rows affected — we don't get insert/update split,
    // so we report a conservative "inserted" total.
    result.inserted += count ?? chunk.length;
  }

  return result;
}
