import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";

/**
 * Pre-warm the Original-tab cache for SASO.
 *
 * Why: SASO's publisher streams PDFs at ~6–8 s/MB. The live Original-tab
 * capture (regulation-original-actions.ts) aborts at 20 s, so any SASO PDF
 * above ~4.5 MB can never finish a live fetch and the viewer shows
 * "Source temporarily unavailable / This operation was aborted" — even though
 * the URL resolves fine in a browser. Fix: download each PDF here with a
 * generous timeout + retries and upload it to the regwatch-public bucket,
 * populating original_storage_path/mime/size/captured_at. Once cached, the
 * viewer takes the cacheValid branch and serves a signed storage URL instantly
 * with no live fetch.
 *
 * Idempotent: skips items already cached fresh (captured_at >= last_changed_at).
 *   npx tsx scripts/regwatch-saso-warm-cache.ts [--force]
 */

const BUCKET = "regwatch-public";
const UA = "vantage-intelle/1.0 (compliance corpus mirror; +https://intelle.io)";
const FETCH_TIMEOUT = 120_000; // 2 min — covers the ~12 MB / 60 s worst case with headroom
const MAX_BYTES = 50 * 1024 * 1024;
const RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPdf(url: string): Promise<{ bytes: Uint8Array; mime: string } | { error: string }> {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/pdf,text/html;q=0.9,*/*;q=0.8" },
        signal: ac.signal,
        redirect: "follow",
      });
      if (!res.ok) {
        if (attempt < RETRIES) { await sleep(1500 * attempt); continue; }
        return { error: `HTTP ${res.status}` };
      }
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      const mime = ct.includes("application/pdf") ? "application/pdf" : "text/html";
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) return { error: `too large (${Math.round(buf.byteLength / 1024 / 1024)} MB)` };
      if (buf.byteLength < 1000) {
        if (attempt < RETRIES) { await sleep(1500 * attempt); continue; }
        return { error: `suspiciously small (${buf.byteLength} B)` };
      }
      return { bytes: new Uint8Array(buf), mime };
    } catch (e) {
      if (attempt < RETRIES) { await sleep(1500 * attempt); continue; }
      return { error: (e as Error).name === "AbortError" ? "timeout" : (e as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: "exhausted retries" };
}

async function main() {
  const force = process.argv.includes("--force");
  const svc = createServiceClient();
  const reg = await svc.from("regulators").select("id").eq("slug", "sa-saso").single();
  const { data: items } = await svc
    .from("regulatory_items")
    .select("id, citation, source_url, last_changed_at, original_storage_path, original_captured_at")
    .eq("regulator_id", reg.data!.id)
    .order("citation");

  console.log(`warming Original cache for ${items?.length ?? 0} SASO PDFs (force=${force})\n`);
  let cached = 0, skipped = 0, failed = 0;
  for (const it of items ?? []) {
    const fresh =
      !!it.original_storage_path &&
      !!it.original_captured_at &&
      (!it.last_changed_at || new Date(it.original_captured_at as string).getTime() >= new Date(it.last_changed_at as string).getTime());
    if (fresh && !force) { skipped++; continue; }

    const got = await fetchPdf(it.source_url as string);
    if ("error" in got) {
      failed++;
      console.log(`  ✗ ${it.citation}: ${got.error}`);
      await svc.from("regulatory_items").update({
        original_capture_error: got.error,
        original_captured_at: new Date().toISOString(),
      }).eq("id", it.id);
      continue;
    }
    const path = `regulations/${it.id}/source.pdf`;
    const up = await svc.storage.from(BUCKET).upload(path, got.bytes, {
      contentType: got.mime, upsert: true, cacheControl: "3600",
    });
    if (up.error) { failed++; console.log(`  ✗ ${it.citation}: upload ${up.error.message}`); continue; }
    await svc.from("regulatory_items").update({
      original_storage_path: path,
      original_mime: got.mime,
      original_size_bytes: got.bytes.byteLength,
      original_captured_at: new Date().toISOString(),
      original_capture_error: null,
    }).eq("id", it.id);
    cached++;
    console.log(`  ✓ ${it.citation} (${(got.bytes.byteLength / 1024 / 1024).toFixed(1)} MB)`);
  }
  console.log(`\n✓ done — ${cached} cached, ${skipped} already-fresh, ${failed} failed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
