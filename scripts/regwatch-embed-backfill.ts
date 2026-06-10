import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";
import {
  embedBatch,
  buildDocumentText,
  toPgVectorLiteral,
  isVoyageConfigured,
} from "../src/lib/regwatch/voyage";

/**
 * Backfill voyage-3-large embeddings for every regulatory_items row that lacks
 * one, so hybrid search's vector lane actually contributes (only ~16 of ~11.6k
 * rows had embeddings — there was no embedding-write pipeline). Uses the same
 * buildDocumentText() shape as query-time so recall lines up.
 *
 * - Cursor-paginated by id: forward progress guaranteed even if a write fails,
 *   and the `embedding is null` filter makes re-runs idempotent (only fills gaps).
 * - Rate-limit aware: defaults pace for Voyage's FREE tier (3 RPM / 10K TPM —
 *   no payment method on file). Each 429 is retried with exponential backoff
 *   rather than crashing, so the run always makes progress. Pass --fast once a
 *   Voyage payment method is added to finish in minutes.
 *
 *   npx tsx scripts/regwatch-embed-backfill.ts [--limit N] [--fast] [--batch N] [--delay MS]
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FAST = process.argv.includes("--fast");
function argNum(flag: string, def: number): number {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? parseInt(process.argv[i + 1], 10) || def : def;
}
// Free tier: small requests, ~3/min. Fast (paid): big requests, minimal pacing.
const PAGE = argNum("--batch", FAST ? 64 : 20);
const REQ_INTERVAL = argNum("--delay", FAST ? 300 : 21_000);

/** Embed with exponential backoff on 429 / rate-limit, never throwing on limits. */
async function embedWithRetry(texts: string[]): Promise<number[][]> {
  let wait = 20_000;
  for (let attempt = 1; attempt <= 7; attempt++) {
    try {
      return await embedBatch(texts, { inputType: "document" });
    } catch (e) {
      const msg = (e as Error).message;
      if (/429|rate|quota|payment/i.test(msg) && attempt < 7) {
        console.log(`  rate-limited (attempt ${attempt}); backing off ${wait / 1000}s…`);
        await sleep(wait);
        wait = Math.min(wait * 2, 120_000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("exhausted embedding retries");
}

async function main() {
  if (!isVoyageConfigured()) throw new Error("VOYAGE_API_KEY is not set");
  const cap = (() => {
    const i = process.argv.indexOf("--limit");
    return i >= 0 ? parseInt(process.argv[i + 1], 10) || Infinity : Infinity;
  })();

  const svc = createServiceClient();
  const todo = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);
  console.log(`rows missing an embedding: ${todo.count} (cap ${cap})\n`);

  let cursor = "00000000-0000-0000-0000-000000000000";
  let done = 0, failed = 0, batches = 0;
  const t0 = Date.now();

  while (done + failed < cap) {
    const { data: rows, error } = await svc
      .from("regulatory_items")
      .select("id, citation, title, summary, jurisdiction_code, regulator:regulators!inner ( name )")
      .is("embedding", null)
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(PAGE);
    if (error) throw new Error(`fetch: ${error.message}`);
    if (!rows || rows.length === 0) break;
    cursor = rows[rows.length - 1].id as string;

    const texts = rows.map((r) => {
      const reg = Array.isArray(r.regulator) ? r.regulator[0] : r.regulator;
      return buildDocumentText({
        regulatorName: (reg?.name as string) ?? "",
        jurisdictionCode: (r.jurisdiction_code as string) ?? "",
        title: (r.title as string) ?? "",
        summary: (r.summary as string | null) ?? null,
        citation: (r.citation as string | null) ?? null,
      });
    });

    const reqStart = Date.now();
    const vecs = await embedWithRetry(texts);

    const writes = await Promise.all(
      rows.map((r, i) =>
        svc.from("regulatory_items").update({ embedding: toPgVectorLiteral(vecs[i]) }).eq("id", r.id),
      ),
    );
    for (const w of writes) {
      if (w.error) { failed++; if (failed <= 3) console.log(`  ✗ write: ${w.error.message}`); }
      else done++;
    }
    batches++;
    if (batches % 5 === 0 || rows.length < PAGE) {
      const mins = (Date.now() - t0) / 60000;
      console.log(`  …${done} embedded, ${failed} failed (${(done / Math.max(mins, 0.1)).toFixed(0)}/min)`);
    }
    // Pace request starts to respect the requests-per-minute ceiling.
    const elapsed = Date.now() - reqStart;
    if (elapsed < REQ_INTERVAL) await sleep(REQ_INTERVAL - elapsed);
  }

  const total = await svc.from("regulatory_items").select("id", { count: "exact", head: true }).not("embedding", "is", null);
  console.log(`\n✓ done — embedded ${done}, failed ${failed} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  rows with embedding now: ${total.count}`);
  if (failed > 0) console.log(`  (re-run to retry the ${failed} that failed — idempotent)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
