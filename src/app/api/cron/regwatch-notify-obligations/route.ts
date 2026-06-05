import { NextResponse } from "next/server";
import { runObligationNotificationFanout } from "@/lib/regwatch/obligation-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Obligation notification fanout cron. Drains the
 * obligation_notification_queue populated by the change-detection triggers
 * (regulation update → reviewer + doc owner; obligation state changes →
 * the right party) and sends via Brevo + Web Push.
 *
 * Shares the alert_deliveries idempotency log with the digest + critical-
 * alert pipelines, so no recipient gets the same item twice on the same
 * channel even if multiple paths fan out concurrently.
 *
 * Auth: same Bearer-token contract as the other regwatch crons.
 *
 * Query params:
 *   ?batch=N  — queue rows to drain this tick (default 30, max 200).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const batchSize = Math.min(
    Math.max(parseInt(url.searchParams.get("batch") ?? "30", 10) || 30, 1),
    200,
  );

  const result = await runObligationNotificationFanout(batchSize);

  return NextResponse.json({
    ok: true,
    batch_size: batchSize,
    ...result,
  });
}
