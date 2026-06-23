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

  // Preserve enrichment-owned fields when the connector emits null. A re-crawl
  // re-emits the same metadata with body_text/body_html/summary = null (the
  // enrichment + body-fetch pipelines fill those out-of-band). Without this,
  // every 15-minute crawl would wipe enriched/backfilled bodies. We read the
  // existing values once (chunked to keep the GET URL bounded) and carry them
  // forward when the incoming value is null.
  type Existing = {
    body_text: string | null;
    body_html: string | null;
    summary: string | null;
    enrichment_status: string | null;
    last_changed_at: string | null;
    topics: string[] | null;
    substances_cas: string[] | null;
    naics_codes: string[] | null;
  };
  const existing = new Map<string, Existing>();
  const citationsByReg = new Map<string, Set<string>>();
  for (const item of items) {
    const rid = slugToId.get(item.regulator_slug);
    if (!rid) continue;
    if (!citationsByReg.has(rid)) citationsByReg.set(rid, new Set());
    citationsByReg.get(rid)!.add(item.citation);
  }
  for (const [rid, citSet] of citationsByReg) {
    const cits = Array.from(citSet);
    for (let i = 0; i < cits.length; i += 100) {
      const slice = cits.slice(i, i + 100);
      const { data: rows, error: exErr } = await supabase
        .from("regulatory_items")
        .select("citation, body_text, body_html, summary, enrichment_status, last_changed_at, topics, substances_cas, naics_codes")
        .eq("regulator_id", rid)
        .in("citation", slice);
      if (exErr) {
        result.errors.push(`existing lookup @${i}: ${exErr.message}`);
        continue;
      }
      for (const r of rows ?? []) {
        existing.set(`${rid}::${r.citation as string}`, {
          body_text: (r.body_text as string | null) ?? null,
          body_html: (r.body_html as string | null) ?? null,
          summary: (r.summary as string | null) ?? null,
          enrichment_status: (r.enrichment_status as string | null) ?? null,
          last_changed_at: (r.last_changed_at as string | null) ?? null,
          topics: (r.topics as string[] | null) ?? null,
          substances_cas: (r.substances_cas as string[] | null) ?? null,
          naics_codes: (r.naics_codes as string[] | null) ?? null,
        });
      }
    }
  }

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
    const ex = existing.get(`${regulator_id}::${item.citation}`);
    // Preserve enrichment status for unchanged items. Re-crawling an unchanged,
    // already-enriched regulation must NOT reset it to 'pending' — that caused
    // a costly re-enrichment churn loop (every crawl re-enriched the whole
    // lookback window). Only (re-)enrich genuinely new items, or ones whose
    // source last_changed_at advanced (i.e. the regulation actually changed).
    let enrichment_status = "pending";
    if (ex) {
      const changed =
        ex.last_changed_at == null ||
        new Date(item.last_changed_at).getTime() > new Date(ex.last_changed_at).getTime();
      enrichment_status = changed ? "pending" : (ex.enrichment_status ?? "pending");
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
      // Don't let a null from the connector erase an enriched value.
      summary: item.summary ?? ex?.summary ?? null,
      body_text: item.body_text ?? ex?.body_text ?? null,
      body_html: item.body_html ?? ex?.body_html ?? null,
      jurisdiction_code: item.jurisdiction_code,
      // Carry forward enrichment-owned arrays when the connector emits none, so
      // a re-crawl doesn't wipe topics/codes off an already-enriched item.
      topics: item.topics?.length ? item.topics : (ex?.topics ?? []),
      substances_cas: item.substances_cas?.length ? item.substances_cas : (ex?.substances_cas ?? []),
      naics_codes: item.naics_codes?.length ? item.naics_codes : (ex?.naics_codes ?? []),
      enrichment_status,
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
