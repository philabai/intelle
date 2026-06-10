import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";
import { buildIeaInForceItems } from "../src/lib/regwatch/connectors/iea-policies";

/**
 * One-time backfill of the IEA Policies database into the int-iea regulator.
 *
 * Ingests every IN-FORCE policy from api.iea.org/v3/policies as an
 * instrument_type="policy" regulatory_item. We upsert rows directly (rather
 * than via persistItems) so the row bodies travel in the POST payload — at
 * ~10k items, persistItems' citation `in(...)` enrichment-preservation lookups
 * would build multi-KB GET URLs and risk HTTP 414. Nothing to preserve on a
 * fresh backfill anyway.
 *
 * Each row is stamped enrichment_status="enriched" + enrichment_metadata
 * body_fetched_at so the Haiku enrich cron and the body-fetch cron both skip
 * them (we already provide curated topics, summary, and body from the API).
 *
 *   npx tsx scripts/regwatch-iea-ingest.ts
 */

const REGULATOR = {
  slug: "int-iea",
  name: "International Energy Agency",
  short_name: "IEA",
  jurisdiction_code: "INT",
  jurisdiction_name: "International",
  region: "int",
  regulator_type: "international-body",
  canonical_url: "https://www.iea.org/policies",
  description:
    "The IEA Policies database catalogues government energy and climate policies worldwide — framework legislation, strategic plans, efficiency standards, methane rules, spending programmes and more. We mirror the in-force entries here as a searchable policy-intelligence layer.",
  topic_domains: ["energy", "emissions", "methane", "power", "fuels", "energy-efficiency"],
};

async function main() {
  const svc = createServiceClient();

  console.log("→ upserting int-iea regulator…");
  const { error: regErr } = await svc.from("regulators").upsert(REGULATOR, { onConflict: "slug" });
  if (regErr) throw new Error(`regulator upsert: ${regErr.message}`);
  const { data: reg } = await svc.from("regulators").select("id").eq("slug", "int-iea").single();
  const regId = reg!.id as string;

  console.log("→ fetching + building in-force IEA policies…");
  const items = await buildIeaInForceItems();
  console.log(`  built ${items.length} in-force policy items`);

  const now = new Date().toISOString();
  const rows = items.map((it) => ({
    regulator_id: regId,
    citation: it.citation,
    slug: it.slug,
    title: it.title,
    instrument_type: it.instrument_type,
    status: it.status,
    effective_date: it.effective_date,
    proposed_date: it.proposed_date,
    consultation_closes_at: it.consultation_closes_at,
    published_at: it.published_at,
    last_changed_at: it.last_changed_at,
    source_url: it.source_url,
    summary: it.summary,
    body_text: it.body_text,
    body_html: it.body_html,
    jurisdiction_code: it.jurisdiction_code,
    topics: it.topics ?? [],
    substances_cas: [],
    naics_codes: [],
    enrichment_status: "enriched",
    enrichment_metadata: { body_source: "iea-api", body_fetched_at: now },
  }));

  console.log(`→ upserting ${rows.length} rows in chunks…`);
  const CHUNK = 200;
  let upserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error, count } = await svc
      .from("regulatory_items")
      .upsert(chunk, { onConflict: "regulator_id,citation", ignoreDuplicates: false, count: "exact" });
    if (error) {
      errors.push(`@${i}: ${error.message}`);
      if (errors.length <= 3) console.log(`  ✗ chunk @${i}: ${error.message}`);
    } else {
      upserted += count ?? chunk.length;
    }
    if (i % 2000 === 0) console.log(`  …${i}/${rows.length}`);
  }

  // ---- verification ----
  const total = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", regId);
  const pending = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", regId)
    .eq("enrichment_status", "pending");
  const withBody = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", regId)
    .not("body_text", "is", null);
  const sample = await svc
    .from("regulatory_items")
    .select("citation, title, instrument_type, topics, source_url")
    .eq("regulator_id", regId)
    .limit(3);

  console.log(`\n✓ done — upserted ${upserted}, ${errors.length} chunk errors`);
  console.log(`  int-iea total items: ${total.count}`);
  console.log(`  still pending-enrichment: ${pending.count} (should be 0)`);
  console.log(`  with body_text: ${withBody.count}`);
  console.log(`  samples:`);
  for (const s of sample.data ?? [])
    console.log(`   · [${s.instrument_type}] ${s.citation} → ${JSON.stringify(s.topics)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
