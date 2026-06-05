#!/usr/bin/env node
/**
 * scripts/regwatch-voyage-backfill.mjs
 *
 * Backfills voyage-3-large embeddings for every regulatory_item that is
 * `enrichment_status = enriched` but has `embedding IS NULL`. Safe to
 * re-run — only touches rows still missing an embedding.
 *
 * Batches: 32 per Voyage call (Voyage limit is 128, we stay conservative).
 * Throttle: 250ms sleep between batches to be polite to the API.
 *
 * Usage:
 *   node --env-file=.env.local scripts/regwatch-voyage-backfill.mjs
 *   node --env-file=.env.local scripts/regwatch-voyage-backfill.mjs --limit 500
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY.
 */

import { createClient } from "@supabase/supabase-js";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-large";
const VOYAGE_DIM = 1024;
const BATCH = 32;
const SLEEP_MS = 250;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const voyageKey = process.env.VOYAGE_API_KEY;
if (!url || !key || !voyageKey) {
  console.error(
    "Missing one of NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VOYAGE_API_KEY. Run with `node --env-file=.env.local scripts/regwatch-voyage-backfill.mjs`",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const overallLimit =
  limitArg !== -1 && args[limitArg + 1] ? Number(args[limitArg + 1]) : Infinity;

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "regwatch" },
});

function buildDocumentText({ regulatorName, jurisdictionCode, title, summary, citation }) {
  return [
    `${regulatorName} (${jurisdictionCode})`,
    citation ?? "",
    title,
    summary ?? "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

function toPgVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

async function embedBatch(inputs) {
  if (inputs.length === 0) return [];
  const safe = inputs.map((s) => (s.trim().length === 0 ? " " : s));
  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${voyageKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: safe,
      input_type: "document",
      output_dimension: VOYAGE_DIM,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Voyage ${res.status}: ${body.slice(0, 240)}`);
  }
  const json = await res.json();
  return [...json.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

async function main() {
  let total = 0;
  let processed = 0;
  let embedded = 0;
  let failed = 0;

  while (processed < overallLimit) {
    const remaining = Math.min(BATCH, overallLimit - processed);
    const { data: rows, error } = await supabase
      .from("regulatory_items")
      .select(
        `id, citation, title, summary, jurisdiction_code,
         regulator:regulators!inner ( name, short_name )`,
      )
      .eq("enrichment_status", "enriched")
      .is("embedding", null)
      .order("ingested_at", { ascending: true })
      .limit(remaining);
    if (error) throw new Error(`select: ${error.message}`);
    if (!rows || rows.length === 0) break;

    total += rows.length;
    const inputs = rows.map((r) => {
      const reg = Array.isArray(r.regulator) ? r.regulator[0] : r.regulator;
      return buildDocumentText({
        regulatorName: reg?.short_name ?? reg?.name ?? "Unknown regulator",
        jurisdictionCode: r.jurisdiction_code,
        title: r.title,
        summary: r.summary,
        citation: r.citation,
      });
    });

    let vecs;
    try {
      vecs = await embedBatch(inputs);
    } catch (e) {
      failed += rows.length;
      console.error(`Batch failed: ${e.message}`);
      // Don't loop forever on persistent failure.
      break;
    }

    // Write each row's embedding back. supabase-js doesn't support multi-row
    // pgvector updates in one statement, so loop per-row. Cheap relative to
    // the embed call itself.
    for (let i = 0; i < rows.length; i++) {
      const literal = toPgVectorLiteral(vecs[i]);
      const { error: upErr } = await supabase
        .from("regulatory_items")
        .update({ embedding: literal })
        .eq("id", rows[i].id);
      if (upErr) {
        failed += 1;
        console.error(`Update ${rows[i].citation}: ${upErr.message}`);
      } else {
        embedded += 1;
      }
    }
    processed += rows.length;
    console.log(
      `${embedded}/${total} embedded (${failed} failed)…`,
    );
    await new Promise((r) => setTimeout(r, SLEEP_MS));
  }

  console.log("");
  console.log("=================================================================");
  console.log(`  Voyage backfill complete:`);
  console.log(`    Total rows scanned:  ${total}`);
  console.log(`    Embeddings written:  ${embedded}`);
  console.log(`    Failed:              ${failed}`);
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Failed:", err.message ?? err);
  process.exit(1);
});
