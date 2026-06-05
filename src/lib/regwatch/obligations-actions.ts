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
