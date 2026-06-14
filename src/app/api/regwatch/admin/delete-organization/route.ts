import { NextResponse } from "next/server";
import { deleteOrganizationCascade } from "@/lib/regwatch/admin/delete-organization";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { recordAudit } from "@/lib/regwatch/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Grace window before a scheduled org deletion is actually purged. */
export const DELETION_GRACE_DAYS = 7;

/**
 * DESTRUCTIVE — organization deletion (F10: soft-delete + grace window).
 *
 * Auth: Bearer ${CRON_SECRET} (service-role op; not reachable by ordinary auth).
 * Body: { organizationId, confirm, requestedBy?, force?, cancel? }
 *   `confirm` must echo organizationId exactly — a typed guard against accidents.
 *
 * Default: SCHEDULES deletion (sets deletion_requested_at). The org is purged by
 *   the regwatch-purge-scheduled cron only after DELETION_GRACE_DAYS.
 * { cancel: true }: clears a pending scheduled deletion (recovery).
 * { force: true }: bypasses the grace window and purges immediately (break-glass).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    organizationId?: unknown; confirm?: unknown; requestedBy?: unknown;
    force?: unknown; cancel?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const confirm = typeof body.confirm === "string" ? body.confirm : "";
  const requestedBy = typeof body.requestedBy === "string" ? body.requestedBy : undefined;
  const force = body.force === true;
  const cancel = body.cancel === true;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  if (confirm !== organizationId) {
    return NextResponse.json(
      { error: "confirm must exactly echo organizationId" },
      { status: 400 },
    );
  }

  const svc = createServiceClient();

  // Cancel a pending scheduled deletion (recovery path).
  if (cancel) {
    await svc
      .from("organizations")
      .update({ deletion_requested_at: null, deletion_requested_by: null })
      .eq("id", organizationId);
    await recordAudit({
      organizationId, action: "org.deletion_cancelled", entityType: "organization",
      entityId: organizationId, metadata: { requestedBy: requestedBy ?? null },
    });
    return NextResponse.json({ ok: true, cancelled: true });
  }

  // Break-glass: purge now.
  if (force) {
    await recordAudit({
      organizationId, action: "org.deletion_forced", entityType: "organization",
      entityId: organizationId, metadata: { requestedBy: requestedBy ?? null },
    });
    const result = await deleteOrganizationCascade(organizationId, requestedBy);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }

  // Default: schedule deletion after the grace window.
  const now = new Date();
  const purgeAfter = new Date(now.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await svc
    .from("organizations")
    .update({
      deletion_requested_at: now.toISOString(),
      deletion_requested_by: requestedBy ?? null,
    })
    .eq("id", organizationId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await recordAudit({
    organizationId, action: "org.deletion_scheduled", entityType: "organization",
    entityId: organizationId,
    metadata: { requestedBy: requestedBy ?? null, purgeAfter: purgeAfter.toISOString(), graceDays: DELETION_GRACE_DAYS },
  });
  return NextResponse.json({
    ok: true,
    scheduled: true,
    purgeAfter: purgeAfter.toISOString(),
    message: `Deletion scheduled. The organization will be permanently purged after ${DELETION_GRACE_DAYS} days unless cancelled.`,
  });
}
