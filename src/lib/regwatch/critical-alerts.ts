import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { sendBrevoEmail } from "@/lib/email/brevo";
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
 * Immediate critical-alert dispatcher.
 *
 * Called inline from runMatchPipeline AFTER critical-severity
 * footprint_matches rows are upserted. Unlike the digest + push crons —
 * which wait until the next 15-min / daily tick — this fires within the
 * same request so a user hears about a critical match seconds after the
 * scraper saw it.
 *
 * Per-match flow:
 *   1. For every (user_id) opted into web-push or email at frequency != 'off'
 *      whose org is the matched org and whose tier permits the channel.
 *   2. Skip if alert_deliveries already has a row for (user_id,
 *      regulatory_item_id, channel) — covers replays from cron runs.
 *   3. Respect the 3/24h web-push cap from push-pipeline.
 *   4. Send one push per active subscription + one Brevo email per user.
 *   5. Record alert_deliveries on success so the cron flows skip these.
 *
 * Failures don't propagate — match-pipeline must complete even if Brevo
 * or web-push are down. We collect errors and return them.
 */

const PUSH_CAP_24H = 3;

export interface CriticalAlertCandidate {
  matchId: string;
  regulatoryItemId: string;
  organizationId: string;
  score: number;
}

export interface CriticalAlertResult {
  candidates: number;
  pushes_sent: number;
  emails_sent: number;
  errors: string[];
}

export async function dispatchImmediateCriticalAlerts(
  candidates: CriticalAlertCandidate[],
): Promise<CriticalAlertResult> {
  const result: CriticalAlertResult = {
    candidates: candidates.length,
    pushes_sent: 0,
    emails_sent: 0,
    errors: [],
  };
  if (candidates.length === 0) return result;

  const svc = createServiceClient();

  // Enrich the items in one round-trip so we can build push/email payloads.
  const itemIds = Array.from(new Set(candidates.map((c) => c.regulatoryItemId)));
  const { data: items, error: itemsErr } = await svc
    .from("regulatory_items")
    .select(
      `id, citation, slug, title, summary, jurisdiction_code, source_url,
       regulator:regulators!inner ( name, short_name )`,
    )
    .in("id", itemIds);
  if (itemsErr) {
    result.errors.push(`item lookup: ${itemsErr.message}`);
    return result;
  }
  type ItemRow = {
    id: string;
    citation: string;
    slug: string;
    title: string;
    summary: string | null;
    jurisdiction_code: string;
    source_url: string;
    regulator: { name: string; short_name: string | null };
  };
  const itemById = new Map<string, ItemRow>(
    (items ?? []).map((r) => {
      const reg = Array.isArray(r.regulator) ? r.regulator[0] : r.regulator;
      return [
        r.id as string,
        {
          id: r.id as string,
          citation: r.citation as string,
          slug: r.slug as string,
          title: r.title as string,
          summary: (r.summary as string) ?? null,
          jurisdiction_code: r.jurisdiction_code as string,
          source_url: r.source_url as string,
          regulator: {
            name: reg?.name as string,
            short_name: (reg?.short_name as string) ?? null,
          },
        },
      ];
    }),
  );

  // Group candidates by org so we hit alert_preferences once per org.
  const orgIds = Array.from(new Set(candidates.map((c) => c.organizationId)));

  // Look up org tier once.
  const { data: orgTierRows } = await svc
    .from("organizations")
    .select("id, name, tier")
    .in("id", orgIds);
  const orgInfo = new Map<string, { name: string; tier: Tier }>(
    (orgTierRows ?? []).map((o) => [
      o.id as string,
      { name: o.name as string, tier: (o.tier as Tier) ?? "free" },
    ]),
  );

  // For each org, pull every user with at least one alert_preferences row
  // they care about. Channels:
  //   - 'email' frequency != 'off'  → send 1-item Brevo email
  //   - 'web-push' frequency != 'off' → send push
  const { data: prefRows } = await svc
    .from("alert_preferences")
    .select("user_id, organization_id, channel, frequency, critical_only")
    .in("organization_id", orgIds)
    .neq("frequency", "off")
    .is("saved_view_id", null);
  type PrefRow = {
    user_id: string;
    organization_id: string;
    channel: "email" | "web-push";
    frequency: string;
    critical_only: boolean;
  };
  const prefs = (prefRows ?? []) as PrefRow[];
  if (prefs.length === 0) return result;

  // Cache auth.users email + name for every (org, user) involved.
  const userIds = Array.from(new Set(prefs.map((p) => p.user_id)));
  const recipientById = new Map<
    string,
    { email: string; name: string | null }
  >();
  for (const uid of userIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(uid);
      if (u.user?.email) {
        recipientById.set(uid, {
          email: u.user.email,
          name:
            (u.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    } catch {
      // skip silently; the dispatcher is best-effort
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io";
  const pushConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY,
  );

  // Process each candidate × eligible-pref combination.
  for (const c of candidates) {
    const item = itemById.get(c.regulatoryItemId);
    if (!item) continue;
    const org = orgInfo.get(c.organizationId);
    if (!org) continue;

    const orgPrefs = prefs.filter((p) => p.organization_id === c.organizationId);
    for (const pref of orgPrefs) {
      const recipient = recipientById.get(pref.user_id);
      if (!recipient) continue;

      // Idempotency — has this (user, item, channel) already been delivered?
      const { data: existingDelivery } = await svc
        .from("alert_deliveries")
        .select("id")
        .eq("user_id", pref.user_id)
        .eq("regulatory_item_id", c.regulatoryItemId)
        .eq("channel", pref.channel)
        .limit(1)
        .maybeSingle();
      if (existingDelivery) continue;

      if (pref.channel === "web-push") {
        if (!pushConfigured) continue;
        if (!canUseFeature(org.tier, "web_push")) continue;

        const recent = await countRecentPushDeliveries(pref.user_id);
        if (recent >= PUSH_CAP_24H) continue;

        const { data: subs } = await svc
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", pref.user_id);
        if (!subs || subs.length === 0) continue;

        const payload: PushPayload = {
          title: `Critical · ${item.jurisdiction_code} · score ${c.score.toFixed(0)}`,
          body: `${item.title} (${item.citation})`,
          url: `/regwatch/r/${item.jurisdiction_code.toLowerCase()}/${item.slug}`,
          severity: "critical",
        };

        let anyDelivered = false;
        for (const sub of subs) {
          const r = await sendPushToSubscription(
            {
              endpoint: sub.endpoint as string,
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
            payload,
          );
          if (r.ok) {
            anyDelivered = true;
          } else if (r.reason === "expired") {
            await deleteSubscription(sub.id as string);
          } else if (r.reason === "transient") {
            result.errors.push(
              `push transient ${r.statusCode} for ${pref.user_id}: ${r.body.slice(0, 120)}`,
            );
          } else if (r.reason === "error") {
            result.errors.push(
              `push error for ${pref.user_id}: ${(r.error as Error).message ?? "unknown"}`,
            );
          }
        }
        if (anyDelivered) {
          await recordPushDelivery({
            userId: pref.user_id,
            organizationId: c.organizationId,
            regulatoryItemId: c.regulatoryItemId,
            subscriptionEndpoint: subs[0]?.endpoint as string,
            status: "sent",
          });
          result.pushes_sent += 1;
        }
        continue;
      }

      if (pref.channel === "email") {
        if (!canUseFeature(org.tier, "email_digests")) continue;
        // critical_only applies even to immediate alerts — though by
        // construction every candidate is critical so this is always true.
        if (pref.critical_only === false) {
          // honoured implicitly: alerts are critical-only by design here
        }

        const html = buildCriticalEmailHtml({
          item,
          baseUrl,
          orgName: org.name,
          recipientName: recipient.name,
          score: c.score,
        });
        const subject = `[Critical] ${item.regulator.short_name ?? item.regulator.name} · ${item.citation}`;
        const sent = await sendBrevoEmail({
          to: [{ email: recipient.email, name: recipient.name ?? undefined }],
          subject,
          htmlContent: html,
        });
        if (!sent.ok) {
          const reason =
            sent.reason === "http-error"
              ? `Brevo ${sent.status}: ${sent.body.slice(0, 200)}`
              : sent.reason;
          result.errors.push(`email to ${recipient.email}: ${reason}`);
          continue;
        }

        await svc.from("alert_deliveries").insert({
          organization_id: c.organizationId,
          user_id: pref.user_id,
          regulatory_item_id: c.regulatoryItemId,
          channel: "email",
          delivery_status: "sent",
          delivery_metadata: {
            immediate: true,
            severity: "critical",
            subject,
          },
        });
        result.emails_sent += 1;
      }
    }
  }

  return result;
}

interface CriticalEmailInput {
  item: {
    citation: string;
    slug: string;
    title: string;
    summary: string | null;
    jurisdiction_code: string;
    source_url: string;
    regulator: { name: string; short_name: string | null };
  };
  baseUrl: string;
  orgName: string | null;
  recipientName: string | null;
  score: number;
}

function buildCriticalEmailHtml(input: CriticalEmailInput): string {
  const { item, baseUrl, orgName, recipientName, score } = input;
  const itemUrl = `${baseUrl}/regwatch/r/${item.jurisdiction_code.toLowerCase()}/${item.slug}`;
  const feedUrl = `${baseUrl}/regwatch/feed?severity=critical`;
  const prefsUrl = `${baseUrl}/regwatch/settings/alerts`;
  const regulatorLabel = item.regulator.short_name ?? item.regulator.name;
  const summary = (item.summary ?? "").slice(0, 480);
  const hello = recipientName ? `Hi ${escape(recipientName)},` : "Hi,";
  const orgLine = orgName ? ` for ${escape(orgName)}` : "";

  return `<!doctype html>
<html><body style="margin:0;background:#0B1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#E5E7EB;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#F87171;margin:0;">Critical alert${orgLine}</p>
    <h1 style="margin:8px 0 4px 0;font-size:20px;font-weight:600;line-height:1.3;color:#FFFFFF;">${escape(item.title)}</h1>
    <p style="margin:0;font-size:12px;color:#94A3B8;">
      ${escape(regulatorLabel)} · ${escape(item.jurisdiction_code)} · <span style="font-family:ui-monospace,Menlo,monospace;">${escape(item.citation)}</span> · score ${score.toFixed(0)}
    </p>

    ${summary ? `<p style="margin:16px 0 0 0;font-size:14px;line-height:1.55;color:#CBD5E1;">${escape(summary)}</p>` : ""}

    <div style="margin:24px 0 16px 0;">
      <a href="${itemUrl}" style="display:inline-block;background:#0EA5E9;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;">Open the regulation →</a>
    </div>
    <p style="margin:8px 0 0 0;font-size:12px;color:#94A3B8;">
      Source: <a href="${escape(item.source_url)}" style="color:#94A3B8;">${escape(item.source_url)}</a>
    </p>

    <hr style="border:none;border-top:1px solid #1F2937;margin:32px 0 16px 0;"/>
    <p style="font-size:11px;color:#64748B;margin:0;">
      ${hello} we sent this because it scored as critical against your operations footprint. View all critical matches in your <a href="${feedUrl}" style="color:#94A3B8;">Feed</a> or change cadence in <a href="${prefsUrl}" style="color:#94A3B8;">Alert preferences</a>.
    </p>
  </div>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
