"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";
import type {
  ObligationSeverity,
  ObligationComplianceStatus,
  ObligationReviewCadence,
  ObligationReviewStatus,
} from "./obligations";

/**
 * Phase 1 server actions for compliance_obligations.
 *
 * Phase 2 will add: transitionObligationState, updateObligationReview
 * (reviewer-side), signOffObligation (admin + mandatory rationale).
 *
 * The admin-lock trigger in 20260613 raises for any attempt to mutate
 * locked columns from a non-admin — these server actions provide the
 * friendly error path and strip locked fields where appropriate.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function ensureObligationContext(): Promise<
  | { ok: true; organizationId: string; userId: string; isAdmin: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const membership = await getMyMembership();
  if (!membership) return { ok: false, error: "No organization" };
  const gate = await checkFeatureGate("compliance_obligations");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Compliance obligations require the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  return {
    ok: true,
    organizationId: membership.organizationId,
    userId: user.id,
    isAdmin: membership.role === "owner" || membership.role === "admin",
  };
}

const severityValues = [
  "negligible",
  "marginal",
  "moderate",
  "critical",
  "catastrophic",
] as const;

const complianceStatusValues = [
  "unknown",
  "non-compliant",
  "at-risk",
  "compliant",
] as const;

const cadenceValues = [
  "none",
  "quarterly",
  "semi-annually",
  "annually",
  "custom",
] as const;

const createObligationSchema = z.object({
  assetId: z.string().uuid(),
  regulatoryItemId: z.string().uuid().nullable(),
  clauseText: z.string().trim().max(4000).nullable().optional(),
  clauseAnchor: z.string().trim().max(120).nullable().optional(),
  severity: z.enum(severityValues).default("moderate"),
  complianceStatus: z.enum(complianceStatusValues).default("unknown"),
  assignedReviewerUserId: z.string().uuid().nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
  reviewCadence: z.enum(cadenceValues).default("none"),
  reviewCadenceCustomDays: z.number().int().min(1).max(3650).nullable().optional(),
});

export async function createObligation(input: unknown): Promise<ActionResult> {
  const parsed = createObligationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin)
    return { ok: false, error: "Only owners and admins can create obligations" };

  // Sanity: asset belongs to caller's org.
  const svc = createServiceClient();
  const { data: asset } = await svc
    .from("assets")
    .select("id, organization_id")
    .eq("id", parsed.data.assetId)
    .maybeSingle();
  if (!asset || asset.organization_id !== ctx.organizationId)
    return { ok: false, error: "Asset not found in your org" };

  // Sanity: assignee (if any) is in caller's org.
  if (parsed.data.assignedReviewerUserId) {
    const { data: peer } = await svc
      .from("organization_members")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("user_id", parsed.data.assignedReviewerUserId)
      .maybeSingle();
    if (!peer)
      return { ok: false, error: "Assignee isn't a member of your org" };
  }

  const reviewStatus = parsed.data.assignedReviewerUserId
    ? "awaiting-triage"
    : "open";

  const { data, error } = await svc
    .from("compliance_obligations")
    .insert({
      organization_id: ctx.organizationId,
      asset_id: parsed.data.assetId,
      regulatory_item_id: parsed.data.regulatoryItemId,
      clause_text: parsed.data.clauseText ?? null,
      clause_anchor: parsed.data.clauseAnchor ?? null,
      severity: parsed.data.severity,
      compliance_status: parsed.data.complianceStatus,
      assigned_reviewer_user_id: parsed.data.assignedReviewerUserId ?? null,
      review_status: reviewStatus,
      review_due_at: parsed.data.reviewDueAt ?? null,
      review_cadence: parsed.data.reviewCadence,
      review_cadence_custom_days:
        parsed.data.reviewCadenceCustomDays ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/obligations");
  revalidatePath("/regwatch/assets");
  return { ok: true, id: data?.id as string };
}

// ---------------------------------------------------------------------------
// Bulk attach: one regulation to many assets at once (the asset-checkbox-
// tree UI calls this on submit).
// ---------------------------------------------------------------------------

const bulkAttachSchema = z.object({
  regulatoryItemId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(500),
  clauseAnchor: z.string().trim().max(120).nullable().optional(),
  clauseText: z.string().trim().max(4000).nullable().optional(),
  severity: z.enum(severityValues).default("moderate"),
  complianceStatus: z.enum(complianceStatusValues).default("unknown"),
  assignedReviewerUserId: z.string().uuid().nullable().optional(),
});

export async function bulkAttachRegulationToAssets(
  input: unknown,
): Promise<ActionResult & { created: number; skipped: number }> {
  const parsed = bulkAttachSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      created: 0,
      skipped: 0,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return { ...ctx, created: 0, skipped: 0 };
  if (!ctx.isAdmin)
    return {
      ok: false,
      created: 0,
      skipped: 0,
      error: "Only owners and admins can attach regulations",
    };

  const svc = createServiceClient();
  // Filter to assets in caller's org.
  const { data: ownedAssets } = await svc
    .from("assets")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .in("id", parsed.data.assetIds);
  const ownedIds = new Set((ownedAssets ?? []).map((a) => a.id as string));
  const validAssetIds = parsed.data.assetIds.filter((id) => ownedIds.has(id));

  const reviewStatus = parsed.data.assignedReviewerUserId
    ? "awaiting-triage"
    : "open";

  const rows = validAssetIds.map((assetId) => ({
    organization_id: ctx.organizationId,
    asset_id: assetId,
    regulatory_item_id: parsed.data.regulatoryItemId,
    clause_text: parsed.data.clauseText ?? null,
    clause_anchor: parsed.data.clauseAnchor ?? null,
    severity: parsed.data.severity as ObligationSeverity,
    compliance_status: parsed.data.complianceStatus as ObligationComplianceStatus,
    assigned_reviewer_user_id: parsed.data.assignedReviewerUserId ?? null,
    review_status: reviewStatus,
    created_by: ctx.userId,
  }));

  // Use upsert with onConflict on the unique tuple so re-attaching is a no-op.
  const { data, error } = await svc
    .from("compliance_obligations")
    .upsert(rows, {
      onConflict: "organization_id,asset_id,regulatory_item_id,clause_anchor",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error)
    return { ok: false, created: 0, skipped: 0, error: error.message };
  const created = (data ?? []).length;
  revalidatePath("/regwatch/obligations");
  revalidatePath("/regwatch/assets");
  return { ok: true, created, skipped: validAssetIds.length - created };
}

// ---------------------------------------------------------------------------
// Cadence helpers (admin only — kept here so the gate is colocated)
// ---------------------------------------------------------------------------

const updateGradeSchema = z.object({
  id: z.string().uuid(),
  severity: z.enum(severityValues).optional(),
  complianceStatus: z.enum(complianceStatusValues).optional(),
  reviewCadence: z.enum(cadenceValues).optional(),
  reviewCadenceCustomDays: z.number().int().min(1).max(3650).nullable().optional(),
});

export async function updateObligationGrade(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateGradeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin)
    return { ok: false, error: "Only owners and admins can change grading" };

  const svc = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.severity !== undefined) patch.severity = parsed.data.severity;
  if (parsed.data.complianceStatus !== undefined)
    patch.compliance_status = parsed.data.complianceStatus;
  if (parsed.data.reviewCadence !== undefined)
    patch.review_cadence = parsed.data.reviewCadence as ObligationReviewCadence;
  if (parsed.data.reviewCadenceCustomDays !== undefined)
    patch.review_cadence_custom_days = parsed.data.reviewCadenceCustomDays;

  if (Object.keys(patch).length === 0)
    return { ok: false, error: "No grade fields supplied" };

  const { error } = await svc
    .from("compliance_obligations")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/obligations");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// State machine — enforces the table from the plan:
//
//   open                → awaiting-triage    (system, on assignment)
//   awaiting-triage     → in-review          (reviewer claims)
//   awaiting-triage     → not-applicable     (reviewer + rationale)
//   in-review           → pending-approval   (reviewer + evidence + notes)
//   in-review           → not-applicable     (reviewer + rationale)
//   pending-approval    → in-review          (admin kick-back with notes)
//   pending-approval    → verified           (admin + signoff_rationale)
//   verified            → closed             (admin)
//   any                 → open               (admin only, "unlock" escape hatch)
//
// Audit trail flows through the AFTER-UPDATE trigger in
// 20260616_regwatch_obligation_state_history.sql which records the
// transition with from/to + actor.
// ---------------------------------------------------------------------------

type Role = "reviewer" | "admin" | "any";

const TRANSITIONS: Record<
  ObligationReviewStatus,
  Partial<Record<ObligationReviewStatus, Role>>
> = {
  open: { "awaiting-triage": "any" },
  "awaiting-triage": {
    "in-review": "reviewer",
    "not-applicable": "reviewer",
  },
  "in-review": {
    "pending-approval": "reviewer",
    "not-applicable": "reviewer",
  },
  "pending-approval": {
    "in-review": "admin",
    verified: "admin",
  },
  verified: { closed: "admin" },
  closed: {},
  "not-applicable": {},
};

function canTransition(
  from: ObligationReviewStatus,
  to: ObligationReviewStatus,
  isAdmin: boolean,
  isReviewer: boolean,
): { ok: true } | { ok: false; reason: string } {
  // Admin escape hatch — re-open any non-open state (audit captured by trigger).
  if (to === "open" && isAdmin) return { ok: true };
  const allowed = TRANSITIONS[from][to];
  if (!allowed) {
    return {
      ok: false,
      reason: `Cannot transition from "${from}" to "${to}"`,
    };
  }
  if (allowed === "admin" && !isAdmin) {
    return { ok: false, reason: "Only owners or admins can do this" };
  }
  if (allowed === "reviewer" && !isReviewer && !isAdmin) {
    return {
      ok: false,
      reason: "Only the assigned reviewer (or an admin) can do this",
    };
  }
  return { ok: true };
}

const reviewStatusValues = [
  "open",
  "awaiting-triage",
  "in-review",
  "pending-approval",
  "verified",
  "closed",
  "not-applicable",
] as const satisfies readonly ObligationReviewStatus[];

const transitionSchema = z.object({
  id: z.string().uuid(),
  toStatus: z.enum(reviewStatusValues),
  /** N/A rationale, kick-back notes, sign-off rationale, etc. */
  notes: z.string().trim().max(2000).optional(),
  /** Required when toStatus === "pending-approval": storage path of evidence. */
  evidenceFilePath: z.string().max(500).optional(),
  /** Required when toStatus === "verified": admin sign-off rationale. */
  signoffRationale: z.string().trim().max(1000).optional(),
});

/**
 * Single entry-point for all state transitions. Looks up the obligation,
 * confirms the caller has the required role, enforces transition rules,
 * applies the side-effects (review_completed_at / sign-off timestamps /
 * evidence path / notes), and writes the audit history via the trigger.
 */
export async function transitionObligationState(
  input: unknown,
): Promise<ActionResult> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { data: obligation, error: getErr } = await svc
    .from("compliance_obligations")
    .select(
      "id, organization_id, review_status, assigned_reviewer_user_id, evidence_file_path, review_notes",
    )
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (getErr || !obligation) {
    return { ok: false, error: "Obligation not found in your org" };
  }
  const fromStatus = obligation.review_status as ObligationReviewStatus;
  const isReviewer = obligation.assigned_reviewer_user_id === ctx.userId;

  const gate = canTransition(fromStatus, parsed.data.toStatus, ctx.isAdmin, isReviewer);
  if (!gate.ok) return { ok: false, error: gate.reason };

  // Pre-conditions per target state.
  if (parsed.data.toStatus === "pending-approval") {
    // Either the legacy single-path is set OR there's at least one row in
    // the new junction. The new dropzone writes to both for backward-compat,
    // but pure-API callers can still use just one.
    const legacyPath =
      parsed.data.evidenceFilePath ??
      (obligation.evidence_file_path as string | null);
    let hasEvidence = !!legacyPath;
    if (!hasEvidence) {
      const { count } = await svc
        .from("obligation_evidence_files")
        .select("id", { count: "exact", head: true })
        .eq("obligation_id", parsed.data.id);
      hasEvidence = (count ?? 0) > 0;
    }
    if (!hasEvidence) {
      return {
        ok: false,
        error: "Evidence file is required to mark review complete",
      };
    }
  }
  if (parsed.data.toStatus === "verified" && !parsed.data.signoffRationale?.trim()) {
    return { ok: false, error: "Sign-off rationale is required" };
  }
  if (parsed.data.toStatus === "not-applicable" && !parsed.data.notes?.trim()) {
    return {
      ok: false,
      error: "Provide a rationale when marking the obligation Not Applicable",
    };
  }
  if (
    parsed.data.toStatus === "in-review" &&
    fromStatus === "pending-approval" &&
    !parsed.data.notes?.trim()
  ) {
    return {
      ok: false,
      error: "Provide notes explaining the kick-back so the reviewer knows what to fix",
    };
  }

  // Tag the actor on the connection so the state-history trigger picks it up.
  // We use a plain SET LOCAL via supabase.rpc('set_config', ...) — supabase-js
  // doesn't expose SET so we leave actor resolution to auth.uid() in the
  // trigger. The trigger falls back to auth.uid() — but service-role calls
  // have no auth.uid(), so we patch the actor in via a separate column path:
  // for service-role callers we INSERT the actor explicitly into the history
  // row after the update.
  const patch: Record<string, unknown> = {
    review_status: parsed.data.toStatus,
  };

  if (parsed.data.toStatus === "in-review" && fromStatus === "awaiting-triage") {
    // Self-claim — also re-stamps the assignee if absent so the audit reads
    // as "Jane took this on".
    if (!obligation.assigned_reviewer_user_id) {
      patch.assigned_reviewer_user_id = ctx.userId;
    }
  }

  if (parsed.data.toStatus === "pending-approval") {
    patch.review_completed_at = new Date().toISOString();
    if (parsed.data.evidenceFilePath !== undefined) {
      patch.evidence_file_path = parsed.data.evidenceFilePath;
    }
    // Append notes to the structured review_notes blob.
    const existing = (obligation.review_notes as Record<string, unknown>) ?? {};
    patch.review_notes = {
      ...existing,
      review_complete_notes: parsed.data.notes ?? null,
      review_complete_at: new Date().toISOString(),
    };
  }

  if (parsed.data.toStatus === "verified") {
    patch.admin_signed_off_at = new Date().toISOString();
    patch.admin_signed_off_by = ctx.userId;
    patch.signoff_rationale = parsed.data.signoffRationale ?? "";
  }

  if (parsed.data.toStatus === "in-review" && fromStatus === "pending-approval") {
    // Kick-back: clear the prior sign-off attempt + write the kick-back note.
    patch.review_completed_at = null;
    const existing = (obligation.review_notes as Record<string, unknown>) ?? {};
    patch.review_notes = {
      ...existing,
      kickback_at: new Date().toISOString(),
      kickback_notes: parsed.data.notes ?? null,
    };
  }

  if (parsed.data.toStatus === "not-applicable") {
    const existing = (obligation.review_notes as Record<string, unknown>) ?? {};
    patch.review_notes = {
      ...existing,
      not_applicable_rationale: parsed.data.notes,
      not_applicable_at: new Date().toISOString(),
    };
  }

  const { error: upErr } = await svc
    .from("compliance_obligations")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (upErr) return { ok: false, error: upErr.message };

  // Patch the actor + notes on the history row the trigger just inserted.
  // We find the latest history row for this obligation that has no actor and
  // backfill it. The trigger uses auth.uid() which for service-role is null.
  const { data: latest } = await svc
    .from("obligation_state_history")
    .select("id, actor_user_id, notes")
    .eq("obligation_id", parsed.data.id)
    .eq("to_status", parsed.data.toStatus)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest && (!latest.actor_user_id || !latest.notes)) {
    const patchHist: Record<string, unknown> = {};
    if (!latest.actor_user_id) patchHist.actor_user_id = ctx.userId;
    if (!latest.notes) {
      const noteText =
        parsed.data.signoffRationale ?? parsed.data.notes ?? null;
      if (noteText) patchHist.notes = noteText;
    }
    if (Object.keys(patchHist).length > 0) {
      await svc
        .from("obligation_state_history")
        .update(patchHist)
        .eq("id", latest.id);
    }
  }

  revalidatePath("/regwatch/obligations");
  revalidatePath(`/regwatch/obligations/${parsed.data.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reviewer side-edits — notes/evidence updates that do NOT change state.
// ---------------------------------------------------------------------------

const reviewUpdateSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(4000).optional(),
  evidenceFilePath: z.string().max(500).optional(),
});

export async function updateObligationReview(
  input: unknown,
): Promise<ActionResult> {
  const parsed = reviewUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return ctx;

  const svc = createServiceClient();
  const { data: obligation } = await svc
    .from("compliance_obligations")
    .select("id, organization_id, assigned_reviewer_user_id, review_notes")
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (!obligation)
    return { ok: false, error: "Obligation not found in your org" };
  const isReviewer = obligation.assigned_reviewer_user_id === ctx.userId;
  if (!isReviewer && !ctx.isAdmin) {
    return { ok: false, error: "Only the assigned reviewer or admins can edit review fields" };
  }

  // Strip locked fields defensively — the trigger will raise too, but this
  // gives the user a clean error path.
  const patch: Record<string, unknown> = {};
  if (parsed.data.notes !== undefined) {
    const existing = (obligation.review_notes as Record<string, unknown>) ?? {};
    patch.review_notes = { ...existing, working_notes: parsed.data.notes };
  }
  if (parsed.data.evidenceFilePath !== undefined) {
    patch.evidence_file_path = parsed.data.evidenceFilePath;
  }
  if (Object.keys(patch).length === 0)
    return { ok: false, error: "Nothing to update" };

  const { error } = await svc
    .from("compliance_obligations")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/regwatch/obligations/${parsed.data.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Evidence upload — reviewer writes to regwatch-documents under
// <org_id>/obligations/<obligation_id>/<uuid>-<filename>. Returns the path
// that the caller then passes into transitionObligationState() as the
// evidenceFilePath, completing the review.
// ---------------------------------------------------------------------------

export async function uploadObligationEvidence(
  formData: FormData,
): Promise<ActionResult & { filePath?: string }> {
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return ctx;
  const obligationId = formData.get("obligationId");
  const file = formData.get("file");
  if (typeof obligationId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Missing obligationId or file" };
  }
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE)
    return { ok: false, error: `File exceeds the 50MB limit (${file.size} bytes)` };

  const svc = createServiceClient();
  const { data: obligation } = await svc
    .from("compliance_obligations")
    .select("id, organization_id, assigned_reviewer_user_id")
    .eq("id", obligationId)
    .maybeSingle();
  if (!obligation || obligation.organization_id !== ctx.organizationId) {
    return { ok: false, error: "Obligation not found in your org" };
  }
  const isReviewer = obligation.assigned_reviewer_user_id === ctx.userId;
  if (!isReviewer && !ctx.isAdmin) {
    return { ok: false, error: "Only the assigned reviewer or admins can upload evidence" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 200);
  const path = `${ctx.organizationId}/obligations/${obligationId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await svc.storage
    .from("regwatch-documents")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true, filePath: path };
}

const assignObligationSchema = z.object({
  id: z.string().uuid(),
  assigneeUserId: z.string().uuid().nullable(),
});

export async function assignObligation(input: unknown): Promise<ActionResult> {
  const parsed = assignObligationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await ensureObligationContext();
  if (!ctx.ok) return ctx;
  if (!ctx.isAdmin)
    return { ok: false, error: "Only owners and admins can assign reviewers" };

  const svc = createServiceClient();
  if (parsed.data.assigneeUserId) {
    const { data: peer } = await svc
      .from("organization_members")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("user_id", parsed.data.assigneeUserId)
      .maybeSingle();
    if (!peer)
      return { ok: false, error: "Assignee isn't a member of your org" };
  }

  const newStatus = parsed.data.assigneeUserId ? "awaiting-triage" : "open";
  const { error } = await svc
    .from("compliance_obligations")
    .update({
      assigned_reviewer_user_id: parsed.data.assigneeUserId,
      review_status: newStatus,
    })
    .eq("id", parsed.data.id)
    .eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/obligations");
  return { ok: true };
}
