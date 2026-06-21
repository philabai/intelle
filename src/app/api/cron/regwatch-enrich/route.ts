import { NextResponse } from "next/server";
import { runEnrichmentBatch } from "@/lib/regwatch/enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Headroom so a full batch (Haiku + best-effort embedding per item) completes
// comfortably; 60s previously, which a throttled Voyage call could exhaust.
export const maxDuration = 300;

/**
 * Enrichment orchestrator. Pulls a batch of `enrichment_status='pending'`
 * regulatory_items and runs Claude Haiku across them to populate topics,
 * substances_cas, naics_codes, and a clean summary. Idempotent — re-runs
 * pick up wherever they left off.
 *
 * Auth: same Bearer-token check as the crawl route.
 *
 * Query params:
 *   ?batch=N  — items to process this invocation (default 25, max 60)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const batchSize = Math.min(
    Math.max(parseInt(url.searchParams.get("batch") ?? "25", 10) || 25, 1),
    60,
  );

  const started = Date.now();
  const result = await runEnrichmentBatch(batchSize);

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - started,
    batch_size: batchSize,
    ...result,
  });
}
