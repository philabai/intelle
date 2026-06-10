import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";

/**
 * Diagnostic: replay the Original-tab capture against every SASO source_url and
 * measure latency + outcome. The viewer aborts at 20s (FETCH_TIMEOUT_MS in
 * regulation-original-actions.ts); anything slower than that shows
 * "Source temporarily unavailable / This operation was aborted" even though the
 * URL resolves fine in a browser. This tells us which SASO PDFs are at risk.
 */

const UA = "vantage-intelle/1.0 (compliance corpus mirror; +https://intelle.io)";
const VIEWER_TIMEOUT = 20_000;
const PROBE_TIMEOUT = 90_000; // generous, so we can see true latency past the viewer cap

async function probe(url: string): Promise<{ ms: number; status: number | string; bytes: number; mime: string }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/pdf,text/html;q=0.9,*/*;q=0.8" },
      signal: ac.signal,
      redirect: "follow",
    });
    const buf = await res.arrayBuffer();
    return {
      ms: Date.now() - t0,
      status: res.status,
      bytes: buf.byteLength,
      mime: (res.headers.get("content-type") ?? "").split(";")[0],
    };
  } catch (e) {
    return { ms: Date.now() - t0, status: (e as Error).name === "AbortError" ? "ABORT" : (e as Error).message, bytes: 0, mime: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const svc = createServiceClient();
  const reg = await svc.from("regulators").select("id").eq("slug", "sa-saso").single();
  const { data: items } = await svc
    .from("regulatory_items")
    .select("citation, source_url")
    .eq("regulator_id", reg.data!.id)
    .order("citation");

  console.log(`probing ${items?.length ?? 0} SASO PDFs (viewer aborts at ${VIEWER_TIMEOUT / 1000}s)\n`);
  let overCap = 0, failed = 0, ok = 0;
  const slow: string[] = [];
  for (const it of items ?? []) {
    const r = await probe(it.source_url as string);
    const mb = (r.bytes / 1024 / 1024).toFixed(1);
    const flag = typeof r.status !== "number" ? "✗ FAIL" : r.ms > VIEWER_TIMEOUT ? "⚠ OVER-CAP" : "✓";
    if (flag === "✗ FAIL") failed++;
    else if (flag === "⚠ OVER-CAP") { overCap++; slow.push(it.citation as string); }
    else ok++;
    console.log(`${flag.padEnd(11)} ${String(r.ms).padStart(6)}ms  ${mb.padStart(5)}MB  ${String(r.status).padStart(6)}  ${it.citation}`);
  }
  console.log(`\n— summary: ${ok} ok (<20s), ${overCap} over-cap (>20s → would abort), ${failed} failed`);
  if (slow.length) {
    console.log(`\nover-cap regs:`);
    for (const s of slow) console.log(`  · ${s}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
