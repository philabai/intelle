import { createServiceClient } from "@/lib/regwatch/supabase/service";

/**
 * Append a row to regwatch.audit_log for a security- or compliance-relevant
 * event (F16 — audit completeness). Writes via the service role (the audit_log
 * RLS policy is service-role INSERT only) and is **non-blocking**: an audit
 * failure must never break the operation it records, so errors are swallowed
 * and logged. Use for: billing tier changes, org deletion, membership changes,
 * connector runs, sign-offs — anything a regulated buyer would expect trailed.
 */
export async function recordAudit(entry: {
  organizationId: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddr?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from("audit_log").insert({
      organization_id: entry.organizationId,
      user_id: entry.userId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
      ip_addr: entry.ipAddr ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch (e) {
    console.warn(`[audit] failed to record "${entry.action}":`, (e as Error).message);
  }
}
