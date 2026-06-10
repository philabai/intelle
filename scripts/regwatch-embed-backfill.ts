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
 * - Voyage calls batched at 64 (embedBatch chunks internally); rate-limit backoff.
 *
 *   npx tsx scripts/regwatch-embed-backfill.ts [--limit N]
 */

const PAGE = 64;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    let vecs: number[][];
    try {
      vecs = await embedBatch(texts, { inputType: "document" });
    } catch (e) {
      const msg = (e as Error).message;
      if (/429|rate|quota/i.test(msg)) {
        console.log(`  rate-limited, backing off 8s…`);
        await sleep(8000);
        vecs = await embedBatch(texts, { inputType: "document" });
      } else {
        throw e;
      }
    }

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
    if (batches % 10 === 0 || rows.length < PAGE) {
      const rate = done / Math.max(1, (Date.now() - t0) / 1000);
      console.log(`  …${done} embedded, ${failed} failed (${rate.toFixed(0)}/s)`);
    }
    await sleep(200); // gentle pacing under Voyage rate limits
  }

  const total = await svc.from("regulatory_items").select("id", { count: "exact", head: true }).not("embedding", "is", null);
  console.log(`\n✓ done — embedded ${done}, failed ${failed} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  rows with embedding now: ${total.count}`);
  if (failed > 0) console.log(`  (re-run to retry the ${failed} that failed — idempotent)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
