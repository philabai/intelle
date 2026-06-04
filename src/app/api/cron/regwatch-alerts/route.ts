import { NextResponse } from "next/server";
import { runAlertDigest, type DigestMode } from "@/lib/regwatch/alerts-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Alert digest orchestrator cron.
 *
 * Schedule (vercel.json): runs daily at 06:00 UTC for the daily mode. The
 * route also runs the WEEKLY digest only on Wednesdays — we route on the
 * day-of-week server-side rather than maintain two cron entries against the
 * Hobby/Pro cap math.
 *
 * Auth: Bearer CRON_SECRET.
 *
 * Query params:
 *   ?mode=daily      — explicit override (default: 'daily' + 'weekly' if Wed)
 *   ?mode=weekly     — explicit override
 *   ?force_weekly=1  — run weekly digest regardless of day-of-week (manual test)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const forceWeekly = url.searchParams.get("force_weekly") === "1";
  const explicitMode = url.searchParams.get("mode") as DigestMode | null;

  const modes: DigestMode[] = [];
  if (explicitMode === "daily" || explicitMode === "weekly") {
    modes.push(explicitMode);
  } else {
    // Default schedule: daily every day; weekly only on Wednesday (3).
    modes.push("daily");
    const isWednesday = new Date().getUTCDay() === 3;
    if (isWednesday || forceWeekly) modes.push("weekly");
  }

  const results: Record<string, unknown> = {};
  for (const mode of modes) {
    results[mode] = await runAlertDigest(mode);
  }

  return NextResponse.json({ ok: true, modes_run: modes, results });
}
