import { NextResponse } from "next/server";
import { REGWATCH_CONNECTORS, findConnector } from "@/lib/regwatch/connectors";
import { persistItems } from "@/lib/regwatch/connectors/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Crawl orchestrator. Iterates every registered connector, fetches items
 * published in the last `lookback` days (default 7), and upserts the merged
 * batch into regwatch.regulatory_items via the service-role client.
 *
 * Auth: Bearer token equal to env CRON_SECRET. Vercel scheduled crons
 * automatically attach an Authorization header carrying this secret when the
 * job is configured in vercel.json.
 *
 * Query params:
 *   ?dry=1          — skip network, return what would be fetched
 *   ?lookback=N     — days back to query (default 7, max 30)
 *   ?only=ID,ID2    — run only specific connectors (comma-separated ids)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lookback = Math.min(
    Math.max(parseInt(url.searchParams.get("lookback") ?? "7", 10) || 7, 1),
    30,
  );
  const dryRun = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("only");
  const requested = only
    ? only
        .split(",")
        .map((s) => findConnector(s.trim()))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : REGWATCH_CONNECTORS;

  const started = Date.now();
  const ctx = { lookbackDays: lookback, now: new Date(), dryRun };

  const perConnector: {
    id: string;
    label: string;
    fetched: number;
    errors: string[];
    persistInserted?: number;
    persistErrors?: string[];
  }[] = [];

  let totalFetched = 0;
  let totalPersisted = 0;

  // Run connectors serially to keep per-host load low and to fit the Vercel
  // function 60s ceiling comfortably. A connector failing doesn't abort the run.
  for (const c of requested) {
    try {
      const r = await c.run(ctx);
      totalFetched += r.fetched;
      const entry = {
        id: c.id,
        label: c.label,
        fetched: r.fetched,
        errors: r.errors,
      } as (typeof perConnector)[number];

      if (!dryRun && r.items.length > 0) {
        const persist = await persistItems(r.items);
        entry.persistInserted = persist.inserted;
        entry.persistErrors = persist.errors;
        totalPersisted += persist.inserted;
      }
      perConnector.push(entry);
    } catch (e) {
      perConnector.push({
        id: c.id,
        label: c.label,
        fetched: 0,
        errors: [`run threw: ${(e as Error).message}`],
      });
    }
  }

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - started,
    lookback_days: lookback,
    dry_run: dryRun,
    connectors_run: perConnector.length,
    total_fetched: totalFetched,
    total_persisted: totalPersisted,
    per_connector: perConnector,
  });
}
