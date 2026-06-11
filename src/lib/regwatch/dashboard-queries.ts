import { createClient } from "./supabase/server";
import { getMyOrganization, getMyFootprint } from "./footprint";
import {
  getMyFeedCounts,
  listApproachingDeadlines,
  type FeedCounts,
  type FeedItem,
} from "./feed-queries";
import { getMyUnseenCount, listMyTopUnseen, type NotificationItem } from "./alerts";
import { getReviewerInbox, type InboxBundle } from "./reviewer-inbox";
import {
  getObligationHeatmap,
  listObligations,
  type ObligationSeverity,
  type ObligationComplianceStatus,
} from "./obligations";

/**
 * Single fast aggregation for the dashboard ("Command Center"). Everything is a
 * COUNT or a top-5 fetch, run in parallel — deliberately NOT the heavy scored
 * feed list, so the landing loads quickly. Org-scoped via RLS (the authed SSR
 * client) except where a reused helper already filters by user/org.
 */

const SEV_RANK: Record<ObligationSeverity, number> = {
  negligible: 0,
  marginal: 1,
  moderate: 2,
  critical: 3,
  catastrophic: 4,
};

export interface HotAsset {
  id: string;
  name: string;
  level: number;
  nonCompliant: number;
  worstSeverity: ObligationSeverity;
}

export interface DocSummary {
  total: number;
  inReview: number;
  openComments: number;
  dueForReview: { id: string; title: string; nextReviewDate: string }[];
  recent: { id: string; title: string; reviewState: string; updatedAt: string }[];
}

export interface ActivityEvent {
  id: string;
  kind: "doc" | "obligation";
  actor: string;
  action: string;
  target: string;
  href: string;
  when: string;
}

const DOC_EVENT_LABEL: Record<string, string> = {
  created: "created",
  updated_metadata: "updated",
  revision_saved: "saved a draft of",
  revision_committed: "saved a new version of",
  uploaded_file: "uploaded a file to",
  submitted_for_review: "submitted for review",
  reviewer_assigned: "assigned a reviewer on",
  approver_assigned: "assigned an approver on",
  reviewer_completed: "completed review of",
  changes_requested: "requested changes on",
  approved: "approved",
  marked_effective: "marked effective",
  comment_added: "commented on",
  comment_resolved: "resolved a comment on",
  superseded: "superseded",
  retired: "retired",
};

/** Recent cross-area activity — internal-document audit events + obligation
 * status changes, merged into one timeline. RLS-scoped to the caller's org. */
export async function getRecentActivity(limit = 8): Promise<ActivityEvent[]> {
  const supabase = await createClient();
  const [docEv, oblEv] = await Promise.all([
    supabase
      .from("internal_document_audit_events")
      .select(
        "id, event_type, actor_display_snapshot, occurred_at, internal_document_id, doc:internal_documents!inner ( title )",
      )
      .order("occurred_at", { ascending: false })
      .limit(limit),
    supabase
      .from("obligation_state_history")
      .select(
        "id, to_status, created_at, obligation_id, obl:compliance_obligations!inner ( asset:assets ( name ) )",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const events: ActivityEvent[] = [];
  for (const e of (docEv.data ?? []) as Record<string, unknown>[]) {
    const doc = Array.isArray(e.doc) ? e.doc[0] : e.doc;
    events.push({
      id: `doc-${e.id}`,
      kind: "doc",
      actor: (e.actor_display_snapshot as string) ?? "Someone",
      action:
        DOC_EVENT_LABEL[e.event_type as string] ??
        (e.event_type as string).replace(/_/g, " "),
      target: (doc as { title?: string })?.title ?? "a document",
      href: `/regwatch/documents/${e.internal_document_id}`,
      when: e.occurred_at as string,
    });
  }
  for (const e of (oblEv.data ?? []) as Record<string, unknown>[]) {
    const obl = Array.isArray(e.obl) ? e.obl[0] : e.obl;
    const assetRel = (obl as { asset?: unknown })?.asset;
    const asset = Array.isArray(assetRel) ? assetRel[0] : assetRel;
    const assetName = (asset as { name?: string })?.name;
    events.push({
      id: `obl-${e.id}`,
      kind: "obligation",
      actor: "",
      action: `moved to ${(e.to_status as string).replace(/-/g, " ")}`,
      target: assetName ? `obligation · ${assetName}` : "an obligation",
      href: "/regwatch/obligations",
      when: e.created_at as string,
    });
  }
  return events.sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, limit);
}

export interface DashboardData {
  orgName: string;
  tier: string;
  role: string | null;
  hasFootprint: boolean;

  feed: FeedCounts;
  deadlines: FeedItem[];

  alertsUnseen: number;
  topAlerts: NotificationItem[];

  inbox: InboxBundle;

  heatmap: Record<ObligationSeverity, Record<ObligationComplianceStatus, number>>;
  obligations: {
    total: number;
    nonCompliant: number;
    atRisk: number;
    compliant: number;
    unknown: number;
    overdue: number;
    highSeverityOpen: number;
  };

  hotAssets: HotAsset[];
  assets: { total: number; byLevel: Record<number, number> };

  docs: DocSummary;

  coverage: { regulators: number; topics: number };

  activity: ActivityEvent[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.functional_role as string | undefined) ?? null;

  const nowIso = new Date().toISOString();
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [
    org,
    footprint,
    feed,
    deadlines,
    alertsUnseen,
    topAlerts,
    inbox,
    heatmap,
    obligationList,
    assetRows,
    docTotalR,
    docStatesR,
    dueDocsR,
    openCommentsR,
    recentDocsR,
    activity,
  ] = await Promise.all([
    getMyOrganization(),
    getMyFootprint(),
    getMyFeedCounts(),
    listApproachingDeadlines(),
    getMyUnseenCount(),
    listMyTopUnseen(5),
    getReviewerInbox(),
    getObligationHeatmap(),
    listObligations({}),
    supabase.from("assets").select("level").is("archived_at", null),
    supabase
      .from("internal_documents")
      .select("id", { count: "exact", head: true })
      .neq("status", "retired"),
    supabase.from("internal_documents").select("review_state").neq("status", "retired"),
    supabase
      .from("internal_documents")
      .select("id, title, next_review_date")
      .not("next_review_date", "is", null)
      .lte("next_review_date", in30)
      .neq("status", "retired")
      .order("next_review_date", { ascending: true })
      .limit(5),
    supabase
      .from("internal_document_comments")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    supabase
      .from("internal_documents")
      .select("id, title, review_state, updated_at")
      .neq("status", "retired")
      .order("updated_at", { ascending: false })
      .limit(5),
    getRecentActivity(8),
  ]);

  // --- Obligations roll-up + hot-asset derivation -------------------------
  let nonCompliant = 0,
    atRisk = 0,
    compliant = 0,
    unknown = 0,
    overdue = 0,
    highSeverityOpen = 0;
  const byAsset = new Map<
    string,
    { name: string; level: number; nc: number; worst: ObligationSeverity }
  >();
  const TERMINAL = new Set(["verified", "closed", "not-applicable"]);
  for (const o of obligationList) {
    if (o.complianceStatus === "non-compliant") nonCompliant += 1;
    else if (o.complianceStatus === "at-risk") atRisk += 1;
    else if (o.complianceStatus === "compliant") compliant += 1;
    else unknown += 1;
    if (o.reviewDueAt && o.reviewDueAt < nowIso && !TERMINAL.has(o.reviewStatus)) overdue += 1;
    const highSev = o.severity === "catastrophic" || o.severity === "critical";
    if (highSev && o.complianceStatus !== "compliant") highSeverityOpen += 1;

    const e =
      byAsset.get(o.assetId) ??
      { name: o.assetName, level: o.assetLevel, nc: 0, worst: "negligible" as ObligationSeverity };
    if (o.complianceStatus === "non-compliant" || o.complianceStatus === "at-risk") e.nc += 1;
    if (SEV_RANK[o.severity] > SEV_RANK[e.worst]) e.worst = o.severity;
    byAsset.set(o.assetId, e);
  }
  const hotAssets: HotAsset[] = [...byAsset.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      level: v.level,
      nonCompliant: v.nc,
      worstSeverity: v.worst,
    }))
    .filter(
      (a) =>
        a.nonCompliant > 0 ||
        a.worstSeverity === "catastrophic" ||
        a.worstSeverity === "critical",
    )
    .sort(
      (a, b) =>
        b.nonCompliant - a.nonCompliant ||
        SEV_RANK[b.worstSeverity] - SEV_RANK[a.worstSeverity],
    )
    .slice(0, 5);

  // --- Assets by level (RLS-scoped) ---------------------------------------
  const byLevel: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const r of assetRows.data ?? []) {
    const lv = (r as { level: number }).level;
    byLevel[lv] = (byLevel[lv] ?? 0) + 1;
  }

  // --- Documents ----------------------------------------------------------
  const docStates = (docStatesR.data ?? []) as { review_state: string | null }[];
  const inReview = docStates.filter((d) => d.review_state === "in_review").length;
  const docs: DocSummary = {
    total: docTotalR.count ?? 0,
    inReview,
    openComments: openCommentsR.count ?? 0,
    dueForReview: ((dueDocsR.data ?? []) as { id: string; title: string; next_review_date: string }[]).map(
      (d) => ({ id: d.id, title: d.title, nextReviewDate: d.next_review_date }),
    ),
    recent: ((recentDocsR.data ?? []) as {
      id: string;
      title: string;
      review_state: string | null;
      updated_at: string;
    }[]).map((d) => ({
      id: d.id,
      title: d.title,
      reviewState: d.review_state ?? "draft",
      updatedAt: d.updated_at,
    })),
  };

  return {
    orgName: org?.organization.name ?? "Your organisation",
    tier: org?.organization.tier ?? "free",
    role,
    hasFootprint: !!footprint?.is_configured,
    feed,
    deadlines: deadlines.slice(0, 5),
    alertsUnseen,
    topAlerts,
    inbox,
    heatmap,
    obligations: {
      total: obligationList.length,
      nonCompliant,
      atRisk,
      compliant,
      unknown,
      overdue,
      highSeverityOpen,
    },
    hotAssets,
    assets: { total: (assetRows.data ?? []).length, byLevel },
    docs,
    coverage: {
      regulators: footprint?.monitored_regulator_slugs.length ?? 0,
      topics: footprint?.monitored_topics.length ?? 0,
    },
    activity,
  };
}
