import { NextResponse } from "next/server";
import { runBodyEnrichmentBatch } from "@/lib/regwatch/body-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Body-enrichment cron. The connectors only persist regulator search-result
 * metadata; this cron walks the corpus and fetches the full source page for
 * rows with a thin/missing body_text so the viewer + Iris retrieval have
 * real text to work with.
 *
 * Source-fetch + HTML extraction lives in body-fetch.ts (shared with the
 * on-demand viewer action). Per-row cooldown stamped in
 * enrichment_metadata.body_fetched_at so failed pages aren't retried on
 * every tick.
 *
 * Auth: same Bearer-token contract as the other regwatch crons.
 *
 * Query params:
 *   ?batch=N  — rows to process this invocation (default 6, max 25). Six
 *               keeps a tick under a minute even when every fetch times
 *               out at the 10s ceiling.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const batchSize = Math.min(
    Math.max(parseInt(url.searchParams.get("batch") ?? "6", 10) || 6, 1),
    25,
  );

  const result = await runBodyEnrichmentBatch(batchSize);

  return NextResponse.json({
    ok: true,
    batch_size: batchSize,
    ...result,
  });
}
