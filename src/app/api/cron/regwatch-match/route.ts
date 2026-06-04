import { NextResponse } from "next/server";
import { runMatchPipeline } from "@/lib/regwatch/match-pipeline";
import { runPushPipeline } from "@/lib/regwatch/push-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Match orchestrator cron. For every configured footprint, scores every
 * regulatory item and upserts a footprint_matches row when the score clears
 * the persistence threshold (15/100).
 *
 * Auth: Bearer token equal to env CRON_SECRET (Vercel injects this when
 * invoking the cron, including the "Run" button in the dashboard).
 *
 * Query params:
 *   ?items_since=N — only score items ingested in the last N days (default 30)
 *   ?footprint=UUID — restrict to one footprint (skips others entirely)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const itemsSinceDays = Math.min(
    Math.max(parseInt(url.searchParams.get("items_since") ?? "30", 10) || 30, 1),
    365,
  );
  const footprintId = url.searchParams.get("footprint") ?? undefined;

  const matchResult = await runMatchPipeline({ itemsSinceDays, footprintId });

  // After matching, run the push fanout for any new critical matches. Silent
  // no-op when VAPID isn't configured; never let push failures fail the
  // match cron itself.
  const pushResult = await runPushPipeline();

  return NextResponse.json({ ok: true, match: matchResult, push: pushResult });
}
