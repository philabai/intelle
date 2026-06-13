import { NextResponse } from "next/server";
import { deleteOrganizationCascade } from "@/lib/regwatch/admin/delete-organization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * DESTRUCTIVE — permanently purges one customer organization (Storage + DB
 * cascade) and writes a deletion certificate. Not reachable by ordinary auth.
 *
 * Auth: Bearer ${CRON_SECRET} (same contract as the crons; service-role op).
 * Body: { "organizationId": "<uuid>", "confirm": "<same uuid>" }
 *   `confirm` must echo organizationId exactly — a typed guard against accidents.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { organizationId?: unknown; confirm?: unknown; requestedBy?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const confirm = typeof body.confirm === "string" ? body.confirm : "";
  const requestedBy =
    typeof body.requestedBy === "string" ? body.requestedBy : undefined;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  if (confirm !== organizationId) {
    return NextResponse.json(
      { error: "confirm must exactly echo organizationId" },
      { status: 400 },
    );
  }

  const result = await deleteOrganizationCascade(organizationId, requestedBy);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
