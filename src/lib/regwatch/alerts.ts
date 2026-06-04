import { createClient } from "./supabase/server";
import type { Severity } from "./match";

/**
 * Server-side reads for the alerts surface (bell, drawer, prefs page).
 * RLS scopes alert_preferences and alert_deliveries to the calling user via
 * user_id = auth.uid().
 */

export type EmailFrequency = "off" | "weekly" | "daily";

export interface UserAlertPrefs {
  emailFrequency: EmailFrequency;
  emailCriticalOnly: boolean;
  webPushEnabled: boolean;
}

const DEFAULT_PREFS: UserAlertPrefs = {
  emailFrequency: "off",         // anti-pattern fix: never send mail by default
  emailCriticalOnly: true,
  webPushEnabled: false,
};

/**
 * Pulls (or returns defaults for) the calling user's alert preferences.
 * The schema models each channel as its own row; we project them into a
 * flatter shape for the form. Missing rows = defaults.
 */
export async function getMyAlertPrefs(): Promise<UserAlertPrefs> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFS;

  const { data, error } = await supabase
    .from("alert_preferences")
    .select("channel, frequency, critical_only")
    .is("saved_view_id", null);

  if (error || !data) return DEFAULT_PREFS;

  const prefs: UserAlertPrefs = { ...DEFAULT_PREFS };
  for (const row of data) {
    if (row.channel === "email") {
      prefs.emailFrequency = (row.frequency as EmailFrequency) ?? "off";
      prefs.emailCriticalOnly = Boolean(row.critical_only);
    } else if (row.channel === "web-push") {
      prefs.webPushEnabled = (row.frequency as string) !== "off";
    }
  }
  return prefs;
}

/**
 * Bell badge count — unseen, unresolved matches. Capped at 99+ in UI.
 */
export async function getMyUnseenCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("footprint_matches")
    .select("id", { count: "exact", head: true })
    .is("seen_at", null)
    .is("resolved_at", null);

  if (error) return 0;
  return count ?? 0;
}

export interface NotificationItem {
  matchId: string;
  score: number;
  severity: Severity;
  jurisdictionCode: string;
  citation: string;
  title: string;
  slug: string;
  regulatorName: string;
  regulatorShortName: string | null;
  matchedAt: string;
}

/**
 * Drawer payload — top unseen+unresolved matches ordered by severity then
 * score then recency. Capped tight so the drawer stays scannable.
 */
export async function listMyTopUnseen(limit = 10): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("footprint_matches")
    .select(
      `id, score, severity, matched_at,
       item:regulatory_items!inner (
         citation, title, slug, jurisdiction_code,
         regulator:regulators!inner ( name, short_name )
       )`,
    )
    .is("seen_at", null)
    .is("resolved_at", null)
    .order("severity", { ascending: true })   // critical first lexicographically
    .order("score", { ascending: false })
    .order("matched_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Re-sort severity by our explicit order (lex sort puts 'critical' before
  // 'high' alphabetically only by accident — better to enforce).
  const order: Record<Severity, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  const rows = data
    .map((row) => {
      const item = Array.isArray(row.item) ? row.item[0] : row.item;
      const reg = Array.isArray(item.regulator) ? item.regulator[0] : item.regulator;
      return {
        matchId: row.id as string,
        score: row.score as number,
        severity: row.severity as Severity,
        jurisdictionCode: item.jurisdiction_code as string,
        citation: item.citation as string,
        title: item.title as string,
        slug: item.slug as string,
        regulatorName: reg.name as string,
        regulatorShortName: (reg.short_name as string) ?? null,
        matchedAt: row.matched_at as string,
      } satisfies NotificationItem;
    })
    .sort((a, b) => order[a.severity] - order[b.severity] || b.score - a.score);

  return rows;
}
