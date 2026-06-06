"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";
import {
  TRANSITIONS,
  canTransition,
  type ReviewAction,
} from "./internal-document-state-machine";
import type {
  InternalDocumentReviewState,
} from "./internal-documents";

/**
 * Review workflow + e-signature server actions.
 *
 * Every state transition runs through `transitionDocument` which:
 *   1. Loads the doc + caller's role on the doc (owner / reviewer /
 *      approver / admin).
 *   2. Checks the requested action's matrix in
 *      `internal-document-state-machine.ts`.
 *   3. Writes a signature row (when the rule says so) using the USER
 *      client — not service-role — so the signer's identity is provable
 *      in Postgres logs.
 *   4. Updates `internal_documents.review_state`.
 *   5. Writes an immutable audit event with the reason for change.
 *
 * Assignments live in `internal_document_review_assignments`. The
 * `assignReviewer` / `assignApprover` actions are admin-only and
 * write to that table; the doc's owner is implicit (it's the
 * `owner_user_id` on `internal_documents`).
 */

interface ActionResult {
  ok: boolean;
  error?: string;
}

async function readForensics(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    const userAgent = h.get("user-agent");
    return { ip: ip ?? null, userAgent: userAgent ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

async function ensureContext(): Promise<
  | {
      ok: true;
      organizationId: string;
      userId: string;
      displayName: string;
      email: string;
      isAdmin: boolean;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const membership = await getMyMembership();
  if (!membership) return { ok: false, error: "No organization" };
  const gate = await checkFeatureGate("internal_documents");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Internal documents require the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    user.id;
  return {
    ok: true,
    organizationId: membership.organizationId,
    userId: user.id,
    displayName,
    email: user.email ?? "",
    isAdmin: membership.role === "owner" || membership.role === "admin",
  };
}

async function resolveRoleOnDoc(
  svc: ReturnType<typeof createServiceClient>,
  docId: string,
  userId: string,
  isOrgAdmin: boolean,
): Promise<"owner" | "reviewer" | "approver" | "admin" | null> {
  if (isOrgAdmin) return "admin";
  const { data: doc } = await svc
    .from("internal_documents")
    .select("owner_user_id")
    .eq("id", docId)
    .maybeSingle();
  if (doc?.owner_user_id === userId) return "owner";
  // Check active assignment (most recent open assignment wins).
  const { data: assignment } = await svc
    .from("internal_document_review_assignments")
    .select("role")
    .eq("internal_document_id", docId)
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assignment) return assignment.role as "owner" | "reviewer" | "approver";
  return null;
}

const transitionSchema = z.object({
  docId: z.string().uuid(),
  action: z.string(),
  reasonForChange: z.string().trim().min(3).max(2000),
});

export async function transitionDocument(
  input: unknown,
): Promise<ActionResult & { newState?: InternalDocumentReviewState }> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const action = parsed.data.action as ReviewAction;
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, error: `Unknown action ${action}` };

  const ctx = await ensureContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();

  const { data: doc, error: loadErr } = await svc
    .from("internal_documents")
    .select(
      "id, organization_id, title, review_state, current_revision_id, owner_user_id",
    )
    .eq("id", parsed.data.docId)
    .maybeSingle();
  if (loadErr || !doc) {
    return { ok: false, error: loadErr?.message ?? "Document not found" };
  }
  if (doc.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Document not in your organization" };
  }
  const from = doc.review_state as InternalDocumentReviewState;

  const role = await resolveRoleOnDoc(
    svc,
    parsed.data.docId,
    ctx.userId,
    ctx.isAdmin,
  );
  if (!canTransition(action, from, role)) {
    return {
      ok: false,
      error: `You cannot ${rule.label.toLowerCase()} from state '${from}' with role '${role ?? "none"}'.`,
    };
  }

  // 1) Write signature using the USER client so signer identity is in the logs.
  if (rule.signature) {
    const userClient = await createClient();
    const forensics = await readForensics();
    const { error: sigErr } = await userClient
      .from("internal_document_signatures")
      .insert({
        organization_id: ctx.organizationId,
        internal_document_id: doc.id,
        revision_id: doc.current_revision_id,
        signer_user_id: ctx.userId,
        meaning: rule.signature,
        display_name_snapshot: ctx.displayName,
        email_snapshot: ctx.email,
        ip_address: forensics.ip,
        user_agent: forensics.userAgent,
      });
    if (sigErr) {
      return { ok: false, error: `Signature failed: ${sigErr.message}` };
    }
  }

  // 2) Update doc state (service client).
  const { error: stateErr } = await svc
    .from("internal_documents")
    .update({ review_state: rule.to })
    .eq("id", doc.id)
    .eq("organization_id", ctx.organizationId);
  if (stateErr) {
    return { ok: false, error: `State update failed: ${stateErr.message}` };
  }

  // 3) Audit event.
  const eventType =
    action === "submitForReview"
      ? "submitted_for_review"
      : action === "withdrawReview"
        ? "changes_requested"
        : action === "recordReviewApprove"
          ? "reviewer_completed"
          : action === "recordReviewRequestChanges"
            ? "changes_requested"
            : action === "recordApproval"
              ? "approved"
              : action === "markEffective"
                ? "marked_effective"
                : "superseded";
  await svc.from("internal_document_audit_events").insert({
    organization_id: ctx.organizationId,
    internal_document_id: doc.id,
    revision_id: doc.current_revision_id,
    event_type: eventType,
    actor_user_id: ctx.userId,
    actor_display_snapshot: ctx.displayName,
    payload: {
      action,
      fromState: from,
      toState: rule.to,
      reasonForChange: parsed.data.reasonForChange,
    },
  });

  revalidatePath(`/regwatch/documents/${doc.id}`);
  revalidatePath("/regwatch/documents");
  return { ok: true, newState: rule.to };
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

const assignSchema = z.object({
  docId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["reviewer", "approver"]),
});

export async function assignReviewerOrApprover(
  input: unknown,
): Promise<ActionResult> {
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const ctx = await ensureContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin) {
    return { ok: false, error: "Only owners and admins can assign reviewers" };
  }

  const svc = createServiceClient();

  // Sanity: doc must be in caller's org.
  const { data: doc } = await svc
    .from("internal_documents")
    .select("id, organization_id, owner_user_id")
    .eq("id", parsed.data.docId)
    .maybeSingle();
  if (!doc || doc.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Document not in your organization" };
  }

  // Sanity: assignee must be a member of the org.
  const { data: peer } = await svc
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (!peer) {
    return { ok: false, error: "Assignee isn't a member of your org" };
  }

  // State-machine guard: reviewer ≠ approver — block assigning the same user
  // to the SAME doc in the OTHER role while an open assignment exists.
  const otherRole = parsed.data.role === "reviewer" ? "approver" : "reviewer";
  const { data: openOther } = await svc
    .from("internal_document_review_assignments")
    .select("id")
    .eq("internal_document_id", doc.id)
    .eq("user_id", parsed.data.userId)
    .eq("role", otherRole)
    .is("completed_at", null)
    .maybeSingle();
  if (openOther) {
    return {
      ok: false,
      error: `That user is already the open ${otherRole} on this doc. A single person can't be both reviewer and approver.`,
    };
  }

  // Idempotent insert — skip if already assigned with same role and open.
  const { data: existing } = await svc
    .from("internal_document_review_assignments")
    .select("id")
    .eq("internal_document_id", doc.id)
    .eq("user_id", parsed.data.userId)
    .eq("role", parsed.data.role)
    .is("completed_at", null)
    .maybeSingle();
  if (existing) {
    return { ok: true };
  }

  const { error: insErr } = await svc
    .from("internal_document_review_assignments")
    .insert({
      organization_id: ctx.organizationId,
      internal_document_id: doc.id,
      user_id: parsed.data.userId,
      role: parsed.data.role,
      assigned_by: ctx.userId,
    });
  if (insErr) return { ok: false, error: insErr.message };

  await svc.from("internal_document_audit_events").insert({
    organization_id: ctx.organizationId,
    internal_document_id: doc.id,
    event_type:
      parsed.data.role === "reviewer"
        ? "reviewer_assigned"
        : "approver_assigned",
    actor_user_id: ctx.userId,
    actor_display_snapshot: ctx.displayName,
    payload: { assigneeUserId: parsed.data.userId, role: parsed.data.role },
  });

  revalidatePath(`/regwatch/documents/${doc.id}`);
  return { ok: true };
}

const unassignSchema = z.object({ assignmentId: z.string().uuid() });

export async function unassignReviewerOrApprover(
  input: unknown,
): Promise<ActionResult> {
  const parsed = unassignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }
  const ctx = await ensureContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin) {
    return { ok: false, error: "Only owners and admins can unassign reviewers" };
  }
  const svc = createServiceClient();
  const { data: assignment } = await svc
    .from("internal_document_review_assignments")
    .select("id, internal_document_id, organization_id")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();
  if (!assignment || assignment.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Assignment not found in your org" };
  }
  const { error } = await svc
    .from("internal_document_review_assignments")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", parsed.data.assignmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/regwatch/documents/${assignment.internal_document_id}`);
  return { ok: true };
}
