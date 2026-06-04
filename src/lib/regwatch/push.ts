import webpush from "web-push";
import { createServiceClient } from "@/lib/regwatch/supabase/service";

/**
 * Web Push primitives. The library is initialized lazily so a missing VAPID
 * key configuration doesn't crash route imports — the sender simply skips
 * with a no-config result, letting the rest of the alerts pipeline continue.
 *
 * Env vars (set in Vercel + .env.local):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — exposed to the browser for subscribe()
 *   VAPID_PRIVATE_KEY             — server-only, signs every push
 *   VAPID_SUBJECT                 — mailto:hello@intelle.io (RFC 8292 contact)
 */

let _configured = false;

function ensureConfigured(): { ok: true } | { ok: false; reason: string } {
  if (_configured) return { ok: true };
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:hello@intelle.io";
  if (!pub || !priv) {
    return { ok: false, reason: "VAPID keys not configured" };
  }
  webpush.setVapidDetails(subj, pub, priv);
  _configured = true;
  return { ok: true };
}

export interface PushPayload {
  /** Notification title (short, action-oriented). */
  title: string;
  /** Notification body (1-2 lines). */
  body: string;
  /** URL to open when the notification is clicked. Must start with /. */
  url: string;
  /** Optional severity for the icon/colour. */
  severity?: "critical" | "high" | "normal" | "low";
}

export type PushSendResult =
  | { ok: true }
  | { ok: false; reason: "not-configured"; message: string }
  | { ok: false; reason: "expired"; statusCode: number }
  | { ok: false; reason: "transient"; statusCode: number; body: string }
  | { ok: false; reason: "error"; error: unknown };

/**
 * Sends one push. If the subscription is gone (404/410), the caller is
 * responsible for deleting it from push_subscriptions — we report the status
 * via the 'expired' branch so callers can act on it.
 */
export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<PushSendResult> {
  const ready = ensureConfigured();
  if (!ready.ok) {
    return { ok: false, reason: "not-configured", message: ready.reason };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // 24h — push services drop after this if browser offline
    );
    return { ok: true };
  } catch (e) {
    // web-push throws a custom error with statusCode.
    const err = e as { statusCode?: number; body?: string };
    const status = err.statusCode ?? 0;
    if (status === 404 || status === 410) {
      return { ok: false, reason: "expired", statusCode: status };
    }
    if (status >= 400 && status < 500) {
      return {
        ok: false,
        reason: "transient",
        statusCode: status,
        body: err.body ?? "",
      };
    }
    return { ok: false, reason: "error", error: e };
  }
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  organization_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Pulls every active push subscription for a user. */
export async function getSubscriptionsForUser(userId: string): Promise<SubscriptionRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, organization_id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) {
    console.error("[regwatch] getSubscriptionsForUser:", error);
    return [];
  }
  return (data ?? []) as SubscriptionRow[];
}

export async function deleteSubscription(id: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("push_subscriptions").delete().eq("id", id);
}

/**
 * Counts pushes already delivered to this user via the alert_deliveries
 * idempotency table inside the last 24h. Used by the 3-per-24h cap from A.3.
 */
export async function countRecentPushDeliveries(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("alert_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("channel", "web-push")
    .gte("delivered_at", since);
  if (error) return 0;
  return count ?? 0;
}

export interface RecordDeliveryInput {
  userId: string;
  organizationId: string;
  regulatoryItemId: string;
  subscriptionEndpoint: string;
  status: "sent" | "failed";
  errorMessage?: string;
}

export async function recordPushDelivery(input: RecordDeliveryInput): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("alert_deliveries").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    regulatory_item_id: input.regulatoryItemId,
    channel: "web-push",
    delivery_status: input.status,
    delivery_metadata: {
      endpoint_host: tryHost(input.subscriptionEndpoint),
      error: input.errorMessage,
    },
  });
}

function tryHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}
