import { NextResponse } from "next/server";
import { REGWATCH_CONNECTORS, findConnector } from "@/lib/regwatch/connectors";
import { persistHierarchy } from "@/lib/regwatch/connectors/persist-hierarchy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hierarchy refresh cron. For every connector that implements
 * `buildHierarchy()`, walks the publisher's table-of-contents, upserts
 * each node into regwatch.regulatory_sections (idempotent on `path`),
 * resolves leaf citations → regulatory_item_id, then triggers the
 * recency refresh helper so the eCFR-style browse view shows accurate
 * "Updated 30d" markers.
 *
 * Auth: Bearer ${CRON_SECRET}. Same shape as regwatch-crawl.
 *
 * Query params:
 *   ?only=ID,ID2 — limit to specific connectors
 *   ?dry=1       — log what would run, no fetches
 *
 * Cadence: nightly (configure in vercel.json).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("only");
  const candidates = only
    ? only
        .split(",")
        .map((s) => findConnector(s.trim()))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
    : REGWATCH_CONNECTORS;

  const withHierarchy = candidates.filter((c) => typeof c.buildHierarchy === "function");

  const started = Date.now();
  const ctx = { lookbackDays: 30, now: new Date(), dryRun };

  const perConnector: {
    id: string;
    label: string;
    nodes_fetched: number;
    upserted: number;
    errors: string[];
  }[] = [];
  let totalUpserted = 0;

  for (const c of withHierarchy) {
    try {
      const roots = await c.buildHierarchy!(ctx);
      const nodesFetched = countNodes(roots);
      if (dryRun || roots.length === 0) {
        perConnector.push({
          id: c.id,
          label: c.label,
          nodes_fetched: nodesFetched,
          upserted: 0,
          errors: nodesFetched === 0 ? ["no nodes returned"] : [],
        });
        continue;
      }
      // jurisdiction_code comes from the first root (or any item the
      // connector emits) — for the FR / eCFR adapters this is "US"; for
      // EUR-Lex "EU"; for SASO "SA". We derive it from connector id.
      const jurisdiction = jurisdictionFromConnectorId(c.id);
      const res = await persistHierarchy(c.regulator_slug, jurisdiction, roots);
      totalUpserted += res.upserted;
      perConnector.push({
        id: c.id,
        label: c.label,
        nodes_fetched: nodesFetched,
        upserted: res.upserted,
        errors: res.errors,
      });
    } catch (e) {
      perConnector.push({
        id: c.id,
        label: c.label,
        nodes_fetched: 0,
        upserted: 0,
        errors: [`hierarchy run threw: ${(e as Error).message}`],
      });
    }
  }

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - started,
    dry_run: dryRun,
    connectors_attempted: withHierarchy.length,
    total_upserted: totalUpserted,
    per_connector: perConnector,
  });
}

function countNodes(roots: { children: unknown[] }[]): number {
  let n = 0;
  const stack: { children: unknown[] }[] = [...roots];
  while (stack.length > 0) {
    const node = stack.pop()!;
    n += 1;
    for (const c of node.children as { children: unknown[] }[]) stack.push(c);
  }
  return n;
}

function jurisdictionFromConnectorId(id: string): string {
  if (id.startsWith("fr-")) return "US";
  if (id.startsWith("eurlex-")) return "EU";
  if (id.startsWith("govuk-")) return "GB";
  if (id.startsWith("saso-")) return "SA";
  if (id.startsWith("imo-")) return "INT";
  return "INT";
}
