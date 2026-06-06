import { createServiceClient } from "./supabase/service";
import type { InternalDocumentReviewState } from "./internal-documents";

/**
 * Read-side helpers for the Review panel. Loads assignments, signatures
 * and audit events for a single doc. All callers must already be in the
 * org (gated upstream on the doc detail page).
 */

export interface ReviewAssignment {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string | null;
  role: "owner" | "reviewer" | "approver";
  assignedAt: string;
  assignedBy: string | null;
  completedAt: string | null;
}

export interface SignatureRow {
  id: string;
  signerUserId: string;
  signerDisplayName: string;
  signerEmail: string | null;
  meaning: "authored" | "reviewed" | "approved";
  signedAt: string;
  ipAddress: string | null;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  actorUserId: string | null;
  actorDisplayName: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export async function getReviewBundle(
  docId: string,
  organizationId: string,
): Promise<{
  reviewState: InternalDocumentReviewState;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  assignments: ReviewAssignment[];
  signatures: SignatureRow[];
  auditEvents: AuditEvent[];
}> {
  const svc = createServiceClient();
  const [
    { data: doc },
    { data: assignmentRows },
    { data: signatureRows },
    { data: auditRows },
  ] = await Promise.all([
    svc
      .from("internal_documents")
      .select("review_state, owner_user_id")
      .eq("id", docId)
      .maybeSingle(),
    svc
      .from("internal_document_review_assignments")
      .select("id, user_id, role, assigned_by, assigned_at, completed_at")
      .eq("internal_document_id", docId)
      .order("assigned_at", { ascending: false }),
    svc
      .from("internal_document_signatures")
      .select(
        "id, signer_user_id, meaning, signed_at, ip_address, display_name_snapshot, email_snapshot",
      )
      .eq("internal_document_id", docId)
      .order("signed_at", { ascending: false }),
    svc
      .from("internal_document_audit_events")
      .select(
        "id, event_type, actor_user_id, actor_display_snapshot, payload, occurred_at",
      )
      .eq("internal_document_id", docId)
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);

  // Resolve display names from auth.users for assignees + owner.
  const userIds = new Set<string>();
  if (doc?.owner_user_id) userIds.add(doc.owner_user_id as string);
  for (const a of assignmentRows ?? []) userIds.add(a.user_id as string);
  const userInfo = new Map<
    string,
    { displayName: string; email: string | null }
  >();
  for (const id of userIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(id);
      if (u.user) {
        userInfo.set(id, {
          displayName:
            (u.user.user_metadata?.full_name as string | undefined) ??
            u.user.email ??
            id,
          email: u.user.email ?? null,
        });
      }
    } catch {
      // best-effort
    }
  }

  const assignments: ReviewAssignment[] = (assignmentRows ?? []).map((a) => {
    const info = userInfo.get(a.user_id as string);
    return {
      id: a.id as string,
      userId: a.user_id as string,
      userDisplayName: info?.displayName ?? (a.user_id as string),
      userEmail: info?.email ?? null,
      role: a.role as "owner" | "reviewer" | "approver",
      assignedAt: a.assigned_at as string,
      assignedBy: (a.assigned_by as string | null) ?? null,
      completedAt: (a.completed_at as string | null) ?? null,
    };
  });

  const signatures: SignatureRow[] = (signatureRows ?? []).map((s) => ({
    id: s.id as string,
    signerUserId: s.signer_user_id as string,
    signerDisplayName:
      (s.display_name_snapshot as string | null) ??
      (s.signer_user_id as string),
    signerEmail: (s.email_snapshot as string | null) ?? null,
    meaning: s.meaning as "authored" | "reviewed" | "approved",
    signedAt: s.signed_at as string,
    ipAddress: (s.ip_address as string | null) ?? null,
  }));

  const auditEvents: AuditEvent[] = (auditRows ?? []).map((e) => ({
    id: e.id as string,
    eventType: e.event_type as string,
    actorUserId: (e.actor_user_id as string | null) ?? null,
    actorDisplayName: (e.actor_display_snapshot as string) ?? "—",
    occurredAt: e.occurred_at as string,
    payload: (e.payload as Record<string, unknown>) ?? {},
  }));

  const ownerInfo = doc?.owner_user_id
    ? userInfo.get(doc.owner_user_id as string)
    : null;

  return {
    reviewState:
      (doc?.review_state as InternalDocumentReviewState) ?? "draft",
    ownerUserId: (doc?.owner_user_id as string | null) ?? null,
    ownerDisplayName: ownerInfo?.displayName ?? null,
    assignments,
    signatures,
    auditEvents,
  };
}
