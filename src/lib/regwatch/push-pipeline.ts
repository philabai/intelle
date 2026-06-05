import { createServiceClient } from "@/lib/regwatch/supabase/service";
import {
  sendPushToSubscription,
  countRecentPushDeliveries,
  deleteSubscription,
  recordPushDelivery,
  type PushPayload,
} from "./push";
import { canUseFeature } from "./tier";
import type { Tier } from "./stripe";

/**
 * Post-match push fanout. Runs after every match cron tick to deliver
 * browser notifications for critical-severity footprint_matches that:
 *   - belong to users opted into web push (alert_preferences),
 *   - have at least one active push_subscriptions row,
 *   - have not yet been pushed about THIS item (alert_deliveries idempotency),
 *   - whose user has not exceeded the 3/24h delivery cap (A.3 anti-fatigue).
 *
 * Expired subscriptions (404/410) are deleted so they don't keep failing.
 */

export interface PushPipelineResult {
  users_considered: number;
  pushes_sent: number;
  expired_subscriptions_removed: number;
  cap_hits: number;
  errors: string[];
  duration_ms: number;
}

const PUSH_CAP_24H = 3;

interface PrefRow {
  user_id: string;
  organization_id: string;
}

interface MatchRow {
  id: string;
  regulatory_item_id: string;
  organization_id: string;
  score: number;
  citation: string;
  jurisdiction_code: string;
  slug: string;
  title: string;
}

export async function runPushPipeline(): Promise<PushPipelineResult> {
  const started = Date.now();
  const result: PushPipelineResult = {
    users_considered: 0,
    pushes_sent: 0,
    expired_subscriptions_removed: 0,
    cap_hits: 0,
    errors: [],
    duration_ms: 0,
  };

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    // No VAPID config — silently no-op so the match cron keeps running.
    result.errors.push("VAPID keys not set; skipping push fanout");
    result.duration_ms = Date.now() - started;
    return result;
  }

  const supabase = createServiceClient();

  // 1. Users opted into web push (frequency != 'off').
  const { data: prefRows, error: prefErr } = await supabase
    .from("alert_preferences")
    .select("user_id, organization_id")
    .eq("channel", "web-push")
    .neq("frequency", "off")
    .is("saved_view_id", null);
  if (prefErr) {
    result.errors.push(`pref query: ${prefErr.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  let prefs = (prefRows ?? []) as PrefRow[];

  // 1a. Tier gate — web push is Pro+. Drop prefs whose org is on Free.
  if (prefs.length > 0) {
    const orgIds = Array.from(new Set(prefs.map((p) => p.organization_id)));
    const { data: orgTierRows } = await supabase
      .from("organizations")
      .select("id, tier")
      .in("id", orgIds);
    const tierByOrgId = new Map<string, Tier>(
      (orgTierRows ?? []).map((o) => [
        o.id as string,
        (o.tier as Tier) ?? "free",
      ]),
    );
    prefs = prefs.filter((p) =>
      canUseFeature(tierByOrgId.get(p.organization_id) ?? "free", "web_push"),
    );
  }

  result.users_considered = prefs.length;
  if (prefs.length === 0) {
    result.duration_ms = Date.now() - started;
    return result;
  }

  for (const pref of prefs) {
    try {
      // 2. Check the 3/24h cap before doing any other work.
      const recent = await countRecentPushDeliveries(pref.user_id);
      let slotsLeft = Math.max(0, PUSH_CAP_24H - recent);
      if (slotsLeft === 0) {
        result.cap_hits += 1;
        continue;
      }

      // 3. Active subscriptions.
      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", pref.user_id);
      if (subsErr) {
        result.errors.push(`sub query for ${pref.user_id}: ${subsErr.message}`);
        continue;
      }
      if (!subs || subs.length === 0) continue;

      // 4. Unresolved critical matches not yet web-push delivered.
      const { data: matchRows, error: matchErr } = await supabase
        .from("footprint_matches")
        .select(
          `id, regulatory_item_id, organization_id, score,
           item:regulatory_items!inner ( citation, title, slug, jurisdiction_code )`,
        )
        .eq("organization_id", pref.organization_id)
        .eq("severity", "critical")
        .is("resolved_at", null)
        .order("score", { ascending: false })
        .limit(slotsLeft * 2); // pull extra in case some are already delivered
      if (matchErr) {
        result.errors.push(`match query for ${pref.user_id}: ${matchErr.message}`);
        continue;
      }
      if (!matchRows || matchRows.length === 0) continue;

      // 5. Dedup against alert_deliveries (channel=web-push).
      const candidateItemIds = matchRows.map((r) => r.regulatory_item_id as string);
      const { data: priorDeliveries } = await supabase
        .from("alert_deliveries")
        .select("regulatory_item_id")
        .eq("user_id", pref.user_id)
        .eq("channel", "web-push")
        .in("regulatory_item_id", candidateItemIds);
      const deliveredIds = new Set<string>(
        (priorDeliveries ?? []).map((d) => d.regulatory_item_id as string),
      );

      const queue: MatchRow[] = (matchRows ?? [])
        .map((row) => {
          const item = Array.isArray(row.item) ? row.item[0] : row.item;
          return {
            id: row.id as string,
            regulatory_item_id: row.regulatory_item_id as string,
            organization_id: row.organization_id as string,
            score: row.score as number,
            citation: item.citation as string,
            jurisdiction_code: item.jurisdiction_code as string,
            slug: item.slug as string,
            title: item.title as string,
          };
        })
        .filter((m) => !deliveredIds.has(m.regulatory_item_id));
      if (queue.length === 0) continue;

      // 6. Send up to `slotsLeft` items.
      for (const match of queue) {
        if (slotsLeft <= 0) break;
        const payload: PushPayload = {
          title: `Critical · score ${match.score.toFixed(0)} · ${match.jurisdiction_code}`,
          body: `${match.title} (${match.citation})`,
          url: `/regwatch/r/${match.jurisdiction_code.toLowerCase()}/${match.slug}`,
          severity: "critical",
        };

        let anyDelivered = false;
        for (const sub of subs) {
          const sendResult = await sendPushToSubscription(
            { endpoint: sub.endpoint as string, p256dh: sub.p256dh as string, auth: sub.auth as string },
            payload,
          );
          if (sendResult.ok) {
            anyDelivered = true;
          } else if (sendResult.reason === "expired") {
            await deleteSubscription(sub.id as string);
            result.expired_subscriptions_removed += 1;
          } else if (sendResult.reason === "not-configured") {
            // Shouldn't get here — we checked env above. Treat as transient.
            result.errors.push(`not-configured mid-run for ${pref.user_id}`);
          } else if (sendResult.reason === "transient") {
            result.errors.push(
              `transient ${sendResult.statusCode} for ${pref.user_id}: ${sendResult.body.slice(0, 120)}`,
            );
          } else {
            result.errors.push(
              `push error for ${pref.user_id}: ${(sendResult.error as Error).message ?? "unknown"}`,
            );
          }
        }

        // 7. Record delivery for idempotency (per item, not per subscription)
        // ONLY if at least one subscription accepted the push.
        if (anyDelivered) {
          await recordPushDelivery({
            userId: pref.user_id,
            organizationId: pref.organization_id,
            regulatoryItemId: match.regulatory_item_id,
            subscriptionEndpoint: subs[0]?.endpoint as string,
            status: "sent",
          });
          result.pushes_sent += 1;
          slotsLeft -= 1;
        }
      }
    } catch (e) {
      result.errors.push(`user ${pref.user_id} threw: ${(e as Error).message}`);
    }
  }

  result.duration_ms = Date.now() - started;
  return result;
}
