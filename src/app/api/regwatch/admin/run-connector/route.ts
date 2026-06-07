import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyMembership } from "@/lib/regwatch/members";
import { findConnector } from "@/lib/regwatch/connectors";
import { persistItems } from "@/lib/regwatch/connectors/persist";
import { persistHierarchy } from "@/lib/regwatch/connectors/persist-hierarchy";

/**
 * Admin-triggered connector run. Same shape as the nightly cron's
 * /api/cron/regwatch-crawl but gated on session-admin auth instead of
 * the CRON_SECRET bearer. Useful for filling a publisher's data right
 * after adding a connector (e.g. SASO) without waiting for the cron.
 *
 * POST /api/regwatch/admin/run-connector
 * Body: { connectorId: string, includeHierarchy?: boolean }
 * Auth: org owner or admin (organization_members.role).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  connectorId: z.string().min(1).max(120),
  includeHierarchy: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await getMyMembership();
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only owners and admins can trigger connector runs" },
      { status: 403 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Body must be { connectorId, includeHierarchy? }" },
      { status: 400 },
    );
  }

  const connector = findConnector(body.connectorId);
  if (!connector) {
    return NextResponse.json(
      { error: `Unknown connector: ${body.connectorId}` },
      { status: 404 },
    );
  }

  const started = Date.now();
  const ctx = { lookbackDays: 30, now: new Date(), dryRun: false };

  let runResult: Awaited<ReturnType<typeof connector.run>> | null = null;
  let persistInserted = 0;
  const persistErrors: string[] = [];
  try {
    runResult = await connector.run(ctx);
    if (runResult.items.length > 0) {
      const persist = await persistItems(runResult.items);
      persistInserted = persist.inserted;
      persistErrors.push(...persist.errors);
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Connector run threw: ${(e as Error).message}`,
        duration_ms: Date.now() - started,
      },
      { status: 500 },
    );
  }

  let hierarchyResult: {
    upserted: number;
    errors: string[];
  } | null = null;
  if (body.includeHierarchy && connector.buildHierarchy) {
    try {
      const roots = await connector.buildHierarchy(ctx);
      const nodes = roots.reduce(function count(acc, n): number {
        return acc + 1 + n.children.reduce(count, 0);
      }, 0);
      const jurisdiction = connector.id.startsWith("saso-")
        ? "SA"
        : connector.id.startsWith("fr-")
          ? "US"
          : connector.id.startsWith("eurlex-")
            ? "EU"
            : "INT";
      const res = await persistHierarchy(
        connector.regulator_slug,
        jurisdiction,
        roots,
      );
      hierarchyResult = {
        upserted: res.upserted,
        errors: [...res.errors, `(${nodes} nodes seen)`],
      };
    } catch (e) {
      hierarchyResult = {
        upserted: 0,
        errors: [`hierarchy run threw: ${(e as Error).message}`],
      };
    }
  }

  return NextResponse.json({
    ok: true,
    connector_id: connector.id,
    duration_ms: Date.now() - started,
    fetched: runResult?.fetched ?? 0,
    fetch_errors: runResult?.errors ?? [],
    persisted: persistInserted,
    persist_errors: persistErrors,
    hierarchy: hierarchyResult,
  });
}
