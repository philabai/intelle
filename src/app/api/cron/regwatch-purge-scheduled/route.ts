import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { deleteOrganizationCascade } from "@/lib/regwatch/admin/delete-organization";
import { recordAudit } from "@/lib/regwatch/audit";
import { DELETION_GRACE_DAYS } from "@/app/api/regwatch/admin/delete-organization/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * F10 — purge organizations whose scheduled-deletion grace window has elapsed.
 * Soft-deletes (deletion_requested_at) are set by the delete-organization
 * endpoint; this cron permanently cascades any that are past
 * DELETION_GRACE_DAYS. Auth: same Bearer CRON_SECRET as the other crons.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const cutoff = new Date(Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: due, error } = await svc
    .from("organizations")
    .select("id, name, deletion_requested_at, deletion_requested_by")
    .not("deletion_requested_at", "is", null)
    .lte("deletion_requested_at", cutoff);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const purged: { id: string; ok: boolean; error?: string }[] = [];
  for (const org of due ?? []) {
    await recordAudit({
      organizationId: org.id, action: "org.purge_executed", entityType: "organization",
      entityId: org.id,
      metadata: {
        requestedBy: org.deletion_requested_by, requestedAt: org.deletion_requested_at,
        name: org.name, graceDays: DELETION_GRACE_DAYS,
      },
    });
    const result = await deleteOrganizationCascade(org.id, org.deletion_requested_by ?? undefined);
    purged.push({ id: org.id, ok: result.ok, error: result.ok ? undefined : "cascade failed" });
  }

  return NextResponse.json({ ok: true, candidates: due?.length ?? 0, purged });
}
