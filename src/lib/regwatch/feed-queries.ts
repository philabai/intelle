import { createClient } from "./supabase/server";
import type { Severity, MatchReason } from "./match";

/**
 * Server-side reads for /regwatch/feed. All queries hit the SSR client so RLS
 * scopes to the calling user's org via the footprint_matches and
 * operations_footprints policies. The Feed never sees other orgs' matches.
 */

export interface FeedItem {
  match_id: string;
  score: number;
  severity: Severity;
  match_reason: MatchReason | null;
  matched_at: string;
  seen_at: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
  item: {
    id: string;
    citation: string;
    slug: string;
    title: string;
    summary: string | null;
    instrument_type: string;
    status: string;
    effective_date: string | null;
    consultation_closes_at: string | null;
    last_changed_at: string;
    jurisdiction_code: string;
    topics: string[];
    regulator: {
      slug: string;
      name: string;
      short_name: string | null;
    };
  };
}

const FEED_SELECT = `
  id, score, severity, match_reason, matched_at, seen_at, resolved_at, assigned_to,
  item:regulatory_items!inner (
    id, citation, slug, title, summary, instrument_type, status,
    effective_date, consultation_closes_at, last_changed_at, jurisdiction_code, topics,
    regulator:regulators!inner ( slug, name, short_name )
  )
`;

export type FeedSort = "score" | "newest" | "deadline" | "recently_changed";

export interface FeedQueryFilters {
  sort?: FeedSort;
  severity?: Severity;
  hideResolved?: boolean;
  /** When set, restricts to matches assigned to this user_id. */
  assignedToUserId?: string;
  /** Shortcut — restricts to matches assigned to the calling user. */
  assignedToMe?: boolean;
  limit?: number;
}

export async function listMyFeed(
  filters: FeedQueryFilters = {},
): Promise<FeedItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("footprint_matches")
    .select(FEED_SELECT)
    .limit(filters.limit ?? 100);

  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.hideResolved !== false) query = query.is("resolved_at", null);

  if (filters.assignedToMe) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) query = query.eq("assigned_to", user.id);
  } else if (filters.assignedToUserId) {
    query = query.eq("assigned_to", filters.assignedToUserId);
  }

  switch (filters.sort ?? "score") {
    case "score":
      query = query.order("score", { ascending: false }).order("matched_at", { ascending: false });
      break;
    case "newest":
      query = query.order("matched_at", { ascending: false });
      break;
    case "recently_changed":
      // Sort by the joined item's last_changed_at requires foreign-table syntax.
      query = query.order("last_changed_at", {
        ascending: false,
        foreignTable: "regulatory_items",
      });
      break;
    case "deadline":
      // Items with the soonest consultation_closes_at or effective_date first.
      query = query.order("consultation_closes_at", {
        ascending: true,
        nullsFirst: false,
        foreignTable: "regulatory_items",
      });
      break;
  }

  const { data, error } = await query;
  if (error) {
    console.error("[regwatch] listMyFeed error:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const item = Array.isArray(row.item) ? row.item[0] : row.item;
    const reg = Array.isArray(item?.regulator) ? item.regulator[0] : item?.regulator;
    return {
      match_id: row.id,
      score: row.score,
      severity: row.severity,
      match_reason: row.match_reason as MatchReason | null,
      matched_at: row.matched_at,
      seen_at: row.seen_at,
      resolved_at: row.resolved_at,
      assigned_to: row.assigned_to,
      item: { ...item, regulator: reg },
    } as FeedItem;
  });
}

export interface FeedCounts {
  total: number;
  critical: number;
  high: number;
  normal: number;
  low: number;
  resolved: number;
  hits_30d: number;
  hits_60d: number;
  hits_90d: number;
}

export async function getMyFeedCounts(): Promise<FeedCounts> {
  const supabase = await createClient();
  const counts: FeedCounts = {
    total: 0,
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
    resolved: 0,
    hits_30d: 0,
    hits_60d: 0,
    hits_90d: 0,
  };

  const { data, error } = await supabase
    .from("footprint_matches")
    .select(
      `severity, resolved_at,
       item:regulatory_items!inner ( effective_date, consultation_closes_at )`,
    );
  if (error) {
    console.error("[regwatch] getMyFeedCounts error:", error);
    return counts;
  }

  const nowMs = Date.now();
  const day = 24 * 60 * 60 * 1000;
  for (const row of data ?? []) {
    counts.total += 1;
    if (row.resolved_at) counts.resolved += 1;
    else if (row.severity === "critical") counts.critical += 1;
    else if (row.severity === "high") counts.high += 1;
    else if (row.severity === "normal") counts.normal += 1;
    else counts.low += 1;

    const item = Array.isArray(row.item) ? row.item[0] : row.item;
    const dl =
      item?.consultation_closes_at ?? item?.effective_date ?? null;
    if (!dl) continue;
    const diff = new Date(dl).getTime() - nowMs;
    if (diff < 0) continue;
    if (diff <= 30 * day) counts.hits_30d += 1;
    if (diff <= 60 * day) counts.hits_60d += 1;
    if (diff <= 90 * day) counts.hits_90d += 1;
  }
  return counts;
}

export async function listApproachingDeadlines(): Promise<FeedItem[]> {
  const supabase = await createClient();
  const horizon = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("footprint_matches")
    .select(FEED_SELECT)
    .is("resolved_at", null)
    .or(
      `consultation_closes_at.gte.${now},effective_date.gte.${now}`,
      { foreignTable: "regulatory_items" },
    )
    .or(
      `consultation_closes_at.lte.${horizon},effective_date.lte.${horizon}`,
      { foreignTable: "regulatory_items" },
    )
    .order("score", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[regwatch] listApproachingDeadlines error:", error);
    return [];
  }
  return (data ?? []).map((row) => {
    const item = Array.isArray(row.item) ? row.item[0] : row.item;
    const reg = Array.isArray(item?.regulator) ? item.regulator[0] : item?.regulator;
    return {
      match_id: row.id,
      score: row.score,
      severity: row.severity,
      match_reason: row.match_reason as MatchReason | null,
      matched_at: row.matched_at,
      seen_at: row.seen_at,
      resolved_at: row.resolved_at,
      assigned_to: row.assigned_to,
      item: { ...item, regulator: reg },
    } as FeedItem;
  });
}
