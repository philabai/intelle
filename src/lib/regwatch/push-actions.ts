"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { getMyOrganization } from "./footprint";
import {
  sendPushToSubscription,
  getSubscriptionsForUser,
  deleteSubscription,
} from "./push";

/**
 * Server actions for managing the calling user's push subscription. The
 * actual webpush.sendNotification() lives in lib/push.ts so it can also be
 * called from the match pipeline.
 */

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(10),
  }),
  userAgent: z.string().max(400).optional(),
});

export interface PushActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Persists the browser-issued PushSubscription. Unique on endpoint so re-
 * registering the same browser is idempotent.
 */
export async function subscribeToPush(input: unknown): Promise<PushActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid subscription" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const org = await getMyOrganization();
  if (!org) return { ok: false, error: "No organization" };

  // Upsert by endpoint — handles the same browser re-subscribing.
  // Endpoint is the unique key in the schema so onConflict targets it.
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        organization_id: org.organization_id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: parsed.data.userAgent ?? null,
      },
      { onConflict: "endpoint", ignoreDuplicates: false },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/settings/alerts");
  return { ok: true };
}

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function unsubscribeFromPush(input: unknown): Promise<PushActionResult> {
  const parsed = unsubscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid endpoint" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/settings/alerts");
  return { ok: true };
}

/**
 * Fires a synthetic notification to every subscription the calling user has,
 * so they can verify the SW is wired up before a real critical match arrives.
 */
export async function sendTestPushToMe(): Promise<
  PushActionResult & { delivered?: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const subs = await getSubscriptionsForUser(user.id);
  if (subs.length === 0) {
    return {
      ok: false,
      error: "No push subscriptions registered for this account.",
    };
  }

  let delivered = 0;
  const errors: string[] = [];
  for (const sub of subs) {
    const result = await sendPushToSubscription(sub, {
      title: "RegWatch test notification",
      body: "If you see this, your browser push setup is working.",
      url: "/regwatch/settings/alerts",
      severity: "normal",
    });
    if (result.ok) {
      delivered += 1;
    } else if (result.reason === "expired") {
      await deleteSubscription(sub.id);
      errors.push(`subscription expired (${result.statusCode}), removed`);
    } else if (result.reason === "not-configured") {
      return { ok: false, error: result.message, delivered };
    } else if (result.reason === "transient") {
      errors.push(`push failed ${result.statusCode}: ${result.body.slice(0, 120)}`);
    } else {
      errors.push(`push error: ${(result.error as Error).message ?? "unknown"}`);
    }
  }
  if (delivered === 0) {
    return {
      ok: false,
      error: errors.join("; "),
      delivered: 0,
    };
  }
  return { ok: true, delivered };
}
