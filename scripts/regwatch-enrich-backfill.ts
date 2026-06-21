import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Drain the regwatch enrichment backlog: repeatedly run the Haiku enrichment
 * batch until no `enrichment_status='pending'` rows remain. Use when the
 * scheduled /api/cron/regwatch-enrich isn't keeping up (e.g. the Vercel cron
 * isn't firing) and the backlog has grown — the daily health digest flags this
 * as CRITICAL.
 *
 * Embeddings are SKIPPED by default (Voyage's unpaid 429 tier would make this
 * ~10x slower); enrichment still completes and embeddings can be filled later
 * with regwatch-embed-backfill. Pass --embed to embed inline.
 *
 *   npx tsx scripts/regwatch-enrich-backfill.ts [--batch N] [--limit N] [--embed]
 */
const arg = (flag: string, def: number) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? parseInt(process.argv[i + 1], 10) || def : def;
};
const BATCH = Math.min(arg("--batch", 25), 25);
const LIMIT = arg("--limit", 100000); // max items to process this run
if (!process.argv.includes("--embed")) delete process.env.VOYAGE_API_KEY; // Haiku-only, fast

async function main() {
  const { runEnrichmentBatch } = await import("../src/lib/regwatch/enrichment");
  const { createServiceClient } = await import("../src/lib/regwatch/supabase/service");
  const svc = createServiceClient();

  const { count: startPending } = await svc
    .from("regulatory_items").select("id", { count: "exact", head: true }).eq("enrichment_status", "pending");
  console.log(`[enrich-backfill] starting — ${startPending ?? "?"} pending, batch=${BATCH}, embed=${process.argv.includes("--embed")}`);

  let processed = 0, enriched = 0, failed = 0, emptyRounds = 0;
  const t0 = Date.now();
  while (processed < LIMIT) {
    const r = await runEnrichmentBatch(BATCH);
    if (r.considered === 0) { emptyRounds++; if (emptyRounds >= 2) break; continue; }
    emptyRounds = 0;
    processed += r.considered; enriched += r.enriched; failed += r.failed;
    if (r.errors?.length) {
      const sample = r.errors.find((e) => !e.startsWith("voyage")) ?? r.errors[0];
      if (sample) console.log(`  · err sample: ${sample.slice(0, 140)}`);
    }
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`  processed=${processed} enriched=${enriched} failed=${failed} (${mins}m)`);
  }

  const { count: endPending } = await svc
    .from("regulatory_items").select("id", { count: "exact", head: true }).eq("enrichment_status", "pending");
  console.log(`[enrich-backfill] done — processed ${processed} (enriched ${enriched}, failed ${failed}); pending now ${endPending ?? "?"}`);
}

main().catch((e) => { console.error("[enrich-backfill] fatal:", e); process.exit(1); });
