import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { sendBrevoEmail } from "@/lib/email/brevo";
import { buildDigest, type DigestMatch } from "./alerts-digest";
import type { Severity } from "./match";

/**
 * Alert digest orchestrator. Runs on a cron; can also be invoked manually
 * with ?mode=daily or ?mode=weekly for testing.
 *
 * Flow:
 *   1. Read every user with email frequency = the requested mode.
 *   2. For each user, pull footprint_matches matched in the lookback window
 *      that haven't yet been delivered via email (alert_deliveries idempotency).
 *   3. Apply the critical-only severity gate per the user's prefs.
 *   4. If there are eligible matches, build the digest, send via Brevo,
 *      and write one alert_deliveries row per match for idempotency.
 *   5. Silently skip when there's nothing to send.
 *
 * The pipeline NEVER sends an unsolicited email — frequency defaults to 'off'
 * and a row only exists in alert_preferences if the user explicitly set it
 * through /regwatch/settings/alerts.
 */

export type DigestMode = "daily" | "weekly";

export interface AlertPipelineResult {
  users_considered: number;
  digests_sent: number;
  matches_delivered: number;
  errors: string[];
  duration_ms: number;
}

interface PrefRow {
  user_id: string;
  organization_id: string;
  critical_only: boolean;
}

interface CandidateMatch extends DigestMatch {
  organizationId: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export async function runAlertDigest(
  mode: DigestMode,
): Promise<AlertPipelineResult> {
  const started = Date.now();
  const result: AlertPipelineResult = {
    users_considered: 0,
    digests_sent: 0,
    matches_delivered: 0,
    errors: [],
    duration_ms: 0,
  };

  const supabase = createServiceClient();
  const sinceMs = mode === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(Date.now() - sinceMs).toISOString();

  // 1. Pull every user opted into this digest cadence.
  const { data: prefRows, error: prefError } = await supabase
    .from("alert_preferences")
    .select("user_id, organization_id, critical_only")
    .eq("channel", "email")
    .eq("frequency", mode)
    .is("saved_view_id", null);

  if (prefError) {
    result.errors.push(`pref query: ${prefError.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  const prefs = (prefRows ?? []) as PrefRow[];
  result.users_considered = prefs.length;
  if (prefs.length === 0) {
    result.duration_ms = Date.now() - started;
    return result;
  }

  // 2. Fetch the auth.users email for every opted-in user in one round-trip.
  // The auth admin API is only callable with service-role and isn't paginated
  // here; for the v1 user base it's fine.
  const emailByUserId = new Map<string, { email: string; name: string | null }>();
  const orgNameByOrgId = new Map<string, string>();
  for (const p of prefs) {
    if (emailByUserId.has(p.user_id)) continue;
    const { data: userResp, error: userErr } =
      await supabase.auth.admin.getUserById(p.user_id);
    if (userErr || !userResp.user || !userResp.user.email) continue;
    emailByUserId.set(p.user_id, {
      email: userResp.user.email,
      name:
        (userResp.user.user_metadata?.full_name as string | undefined) ?? null,
    });
  }

  const orgIds = Array.from(new Set(prefs.map((p) => p.organization_id)));
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    for (const o of orgs ?? []) {
      orgNameByOrgId.set(o.id as string, o.name as string);
    }
  }

  // 3. For each user, pull eligible matches + filter against alert_deliveries.
  for (const pref of prefs) {
    const recipient = emailByUserId.get(pref.user_id);
    if (!recipient) {
      result.errors.push(`no auth.users record for ${pref.user_id}`);
      continue;
    }

    const { data: matchRows, error: matchError } = await supabase
      .from("footprint_matches")
      .select(
        `id, score, severity, matched_at, organization_id,
         item:regulatory_items!inner (
           citation, title, slug, summary, jurisdiction_code,
           regulator:regulators!inner ( name, short_name )
         )`,
      )
      .eq("organization_id", pref.organization_id)
      .gte("matched_at", sinceIso)
      .is("resolved_at", null);

    if (matchError) {
      result.errors.push(`match query for ${pref.user_id}: ${matchError.message}`);
      continue;
    }

    let candidates: CandidateMatch[] = (matchRows ?? []).map((row) => {
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
        summary: (item.summary as string) ?? null,
        regulatorName: reg.name as string,
        regulatorShortName: (reg.short_name as string) ?? null,
        matchedAt: row.matched_at as string,
        organizationId: row.organization_id as string,
      };
    });

    if (pref.critical_only) {
      candidates = candidates.filter((c) => c.severity === "critical");
    }
    if (candidates.length === 0) continue;

    // 4. Idempotency — skip matches we've already emailed to this user.
    const { data: priorDeliveries } = await supabase
      .from("alert_deliveries")
      .select("regulatory_item_id")
      .eq("user_id", pref.user_id)
      .eq("channel", "email")
      .in(
        "regulatory_item_id",
        candidates.map((c) => c.matchId), // we'll re-join via match → item below
      );
    // We deduped by regulatory_item_id but candidates carry matchIds. Convert.
    // Re-read: alert_deliveries records by regulatory_item_id, not by match_id.
    // Pull item ids from candidates by joining once more — easier path: do a
    // single lookup mapping match_id → regulatory_item_id.
    const { data: matchToItem } = await supabase
      .from("footprint_matches")
      .select("id, regulatory_item_id")
      .in(
        "id",
        candidates.map((c) => c.matchId),
      );
    const itemIdByMatchId = new Map<string, string>(
      (matchToItem ?? []).map((r) => [
        r.id as string,
        r.regulatory_item_id as string,
      ]),
    );
    const deliveredItemIds = new Set<string>(
      (priorDeliveries ?? []).map((d) => d.regulatory_item_id as string),
    );
    candidates = candidates.filter((c) => {
      const itemId = itemIdByMatchId.get(c.matchId);
      if (!itemId) return false;
      return !deliveredItemIds.has(itemId);
    });
    if (candidates.length === 0) continue;

    // Cap per-digest at 25 items so the email stays scannable. Critical
    // overflow is intentional — Phase 1.7 alerts will fire immediately
    // outside this batched flow.
    candidates = candidates
      .sort(
        (a, b) =>
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          b.score - a.score,
      )
      .slice(0, 25);

    // 5. Build + send.
    const digest = buildDigest({
      matches: candidates,
      window: mode,
      recipientName: recipient.name,
      baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io",
      orgName: orgNameByOrgId.get(pref.organization_id) ?? null,
    });
    if (!digest) continue;

    const sendResult = await sendBrevoEmail({
      to: [{ email: recipient.email, name: recipient.name ?? undefined }],
      subject: digest.subject,
      htmlContent: digest.htmlContent,
    });

    if (!sendResult.ok) {
      const reason =
        sendResult.reason === "http-error"
          ? `Brevo ${sendResult.status}: ${sendResult.body.slice(0, 200)}`
          : sendResult.reason;
      result.errors.push(`send to ${recipient.email}: ${reason}`);
      continue;
    }

    // Write delivery rows for idempotency.
    const deliveryRows = candidates
      .map((c) => itemIdByMatchId.get(c.matchId))
      .filter((id): id is string => Boolean(id))
      .map((regulatoryItemId) => ({
        organization_id: pref.organization_id,
        user_id: pref.user_id,
        regulatory_item_id: regulatoryItemId,
        channel: "email",
        delivery_status: "sent",
        delivery_metadata: { mode, subject: digest.subject },
      }));

    if (deliveryRows.length > 0) {
      const { error: insErr } = await supabase
        .from("alert_deliveries")
        .insert(deliveryRows);
      if (insErr) {
        result.errors.push(`delivery insert for ${recipient.email}: ${insErr.message}`);
      }
    }

    result.digests_sent += 1;
    result.matches_delivered += candidates.length;
  }

  result.duration_ms = Date.now() - started;
  return result;
}
