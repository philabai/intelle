import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

/**
 * compliance_obligations read-side. Mutations live in obligations-actions.ts.
 */

export type ObligationSeverity =
  | "negligible"
  | "marginal"
  | "moderate"
  | "critical"
  | "catastrophic";

export type ObligationComplianceStatus =
  | "unknown"
  | "non-compliant"
  | "at-risk"
  | "compliant";

export type ObligationReviewStatus =
  | "open"
  | "awaiting-triage"
  | "in-review"
  | "pending-approval"
  | "verified"
  | "closed"
  | "not-applicable";

export type ObligationReviewCadence =
  | "none"
  | "quarterly"
  | "semi-annually"
  | "annually"
  | "custom";

export interface ObligationListItem {
  id: string;
  organizationId: string;
  assetId: string;
  assetName: string;
  assetLevel: number;
  regulatoryItemId: string | null;
  regulationCitation: string | null;
  regulationTitle: string | null;
  clauseAnchor: string | null;
  severity: ObligationSeverity;
  complianceStatus: ObligationComplianceStatus;
  reviewStatus: ObligationReviewStatus;
  assignedReviewerUserId: string | null;
  /** Resolved display name of the assigned reviewer, null if unassigned. */
  assignedReviewerName: string | null;
  reviewDueAt: string | null;
  complianceAttestedUntil: string | null;
  adminSignedOffAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObligationDetail extends ObligationListItem {
  clauseText: string | null;
  reviewCadence: ObligationReviewCadence;
  reviewCadenceCustomDays: number | null;
  reviewNotes: Record<string, unknown>;
  evidenceFilePath: string | null;
  reviewCompletedAt: string | null;
  adminSignedOffBy: string | null;
  signoffRationale: string | null;
  createdBy: string | null;
}

const LIST_COLUMNS = `
  id, organization_id, asset_id, regulatory_item_id, clause_anchor,
  severity, compliance_status, review_status, assigned_reviewer_user_id,
  review_due_at, compliance_attested_until, admin_signed_off_at,
  created_at, updated_at,
  asset:assets!inner ( name, level ),
  regulation:regulatory_items ( citation, title )
`;

type ListRow = {
  id: string;
  organization_id: string;
  asset_id: string;
  regulatory_item_id: string | null;
  clause_anchor: string | null;
  severity: ObligationSeverity;
  compliance_status: ObligationComplianceStatus;
  review_status: ObligationReviewStatus;
  assigned_reviewer_user_id: string | null;
  review_due_at: string | null;
  compliance_attested_until: string | null;
  admin_signed_off_at: string | null;
  created_at: string;
  updated_at: string;
  asset: { name: string; level: number } | { name: string; level: number }[];
  regulation: { citation: string; title: string } | { citation: string; title: string }[] | null;
};

function mapListRow(
  row: ListRow,
  nameByUserId?: Map<string, string>,
): ObligationListItem {
  const asset = Array.isArray(row.asset) ? row.asset[0] : row.asset;
  const reg = Array.isArray(row.regulation) ? row.regulation[0] : row.regulation;
  const assigneeId = row.assigned_reviewer_user_id;
  return {
    id: row.id,
    organizationId: row.organization_id,
    assetId: row.asset_id,
    assetName: asset?.name ?? "(unknown asset)",
    assetLevel: asset?.level ?? 0,
    regulatoryItemId: row.regulatory_item_id,
    regulationCitation: reg?.citation ?? null,
    regulationTitle: reg?.title ?? null,
    clauseAnchor: row.clause_anchor,
    severity: row.severity,
    complianceStatus: row.compliance_status,
    reviewStatus: row.review_status,
    assignedReviewerUserId: assigneeId,
    assignedReviewerName: assigneeId
      ? (nameByUserId?.get(assigneeId) ?? null)
      : null,
    reviewDueAt: row.review_due_at,
    complianceAttestedUntil: row.compliance_attested_until,
    adminSignedOffAt: row.admin_signed_off_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ListObligationsFilters {
  assetId?: string;
  regulatoryItemId?: string;
  reviewStatus?: ObligationReviewStatus | "open-all";
  assignedToMe?: boolean;
  severity?: ObligationSeverity;
}

export async function listObligations(
  filters: ListObligationsFilters = {},
  limit = 200,
): Promise<ObligationListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let q = supabase
    .from("compliance_obligations")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.assetId) q = q.eq("asset_id", filters.assetId);
  if (filters.regulatoryItemId) q = q.eq("regulatory_item_id", filters.regulatoryItemId);
  if (filters.severity) q = q.eq("severity", filters.severity);
  if (filters.assignedToMe && user) q = q.eq("assigned_reviewer_user_id", user.id);

  if (filters.reviewStatus && filters.reviewStatus !== "open-all") {
    q = q.eq("review_status", filters.reviewStatus);
  } else if (filters.reviewStatus === "open-all") {
    q = q.not(
      "review_status",
      "in",
      "(closed,not-applicable,verified)",
    );
  }

  const { data, error } = await q;
  if (error) {
    console.error("[regwatch] listObligations:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as ListRow[];

  // Batch-resolve assignee display names. Goes through the service
  // client because auth.users isn't directly queryable by RLS-bound
  // clients. One round-trip per distinct user id; capped per row count
  // already on this query, so the worst case is ~200 lookups.
  const assigneeIds = Array.from(
    new Set(
      rows
        .map((r) => r.assigned_reviewer_user_id)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );
  const nameByUserId = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const svc = createServiceClient();
    await Promise.all(
      assigneeIds.map(async (uid) => {
        try {
          const { data: u } = await svc.auth.admin.getUserById(uid);
          if (u?.user) {
            const display =
              (u.user.user_metadata?.full_name as string | undefined) ??
              u.user.email ??
              uid.slice(0, 8);
            nameByUserId.set(uid, display);
          }
        } catch {
          // best-effort — leave unset, UI falls back to "Assigned"
        }
      }),
    );
  }

  return rows.map((r) => mapListRow(r, nameByUserId));
}

export async function getObligation(id: string): Promise<ObligationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compliance_obligations")
    .select(
      `id, organization_id, asset_id, regulatory_item_id, clause_anchor, clause_text,
       severity, compliance_status, review_status,
       assigned_reviewer_user_id, review_due_at, review_completed_at,
       review_notes, evidence_file_path, review_cadence, review_cadence_custom_days,
       compliance_attested_until, admin_signed_off_at, admin_signed_off_by,
       signoff_rationale, created_by, created_at, updated_at,
       asset:assets!inner ( name, level ),
       regulation:regulatory_items ( citation, title )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const list = mapListRow(data as unknown as ListRow);
  return {
    ...list,
    clauseText: (data.clause_text as string | null) ?? null,
    reviewCadence: data.review_cadence as ObligationReviewCadence,
    reviewCadenceCustomDays:
      (data.review_cadence_custom_days as number | null) ?? null,
    reviewNotes: (data.review_notes as Record<string, unknown>) ?? {},
    evidenceFilePath: (data.evidence_file_path as string | null) ?? null,
    reviewCompletedAt: (data.review_completed_at as string | null) ?? null,
    adminSignedOffBy: (data.admin_signed_off_by as string | null) ?? null,
    signoffRationale: (data.signoff_rationale as string | null) ?? null,
    createdBy: (data.created_by as string | null) ?? null,
  };
}

/** Heatmap counts for the dashboard — severity × compliance_status grid. */
export async function getObligationHeatmap(): Promise<
  Record<ObligationSeverity, Record<ObligationComplianceStatus, number>>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compliance_obligations")
    .select("severity, compliance_status");
  const grid: Record<ObligationSeverity, Record<ObligationComplianceStatus, number>> = {
    negligible: { unknown: 0, "non-compliant": 0, "at-risk": 0, compliant: 0 },
    marginal: { unknown: 0, "non-compliant": 0, "at-risk": 0, compliant: 0 },
    moderate: { unknown: 0, "non-compliant": 0, "at-risk": 0, compliant: 0 },
    critical: { unknown: 0, "non-compliant": 0, "at-risk": 0, compliant: 0 },
    catastrophic: { unknown: 0, "non-compliant": 0, "at-risk": 0, compliant: 0 },
  };
  for (const row of data ?? []) {
    const sev = row.severity as ObligationSeverity;
    const st = row.compliance_status as ObligationComplianceStatus;
    grid[sev][st] = (grid[sev][st] ?? 0) + 1;
  }
  return grid;
}
