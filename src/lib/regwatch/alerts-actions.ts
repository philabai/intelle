"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { getMyOrganization } from "./footprint";

/**
 * User-facing alert mutations. Writes go through the SSR-authed client so
 * RLS enforces user_id = auth.uid() on alert_preferences. The per-channel
 * upsert pattern fits the channel-per-row schema model.
 */

const saveSchema = z.object({
  emailFrequency: z.enum(["off", "weekly", "daily"]),
  emailCriticalOnly: z.boolean(),
  webPushEnabled: z.boolean(),
});

export interface SaveAlertPrefsResult {
  ok: boolean;
  error?: string;
}

export async function saveAlertPrefs(
  input: unknown,
): Promise<SaveAlertPrefsResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const org = await getMyOrganization();
  if (!org) return { ok: false, error: "No organization" };

  // Two upserts — one per channel. Conflict target is the schema's natural
  // key (user_id, saved_view_id, channel) with saved_view_id null for the
  // global default. Postgres treats null as a value in unique constraints
  // only when nulls-not-distinct is set; defensively we delete+insert.
  const channels: { channel: string; frequency: string; critical_only: boolean }[] = [
    {
      channel: "email",
      frequency: parsed.data.emailFrequency,
      critical_only: parsed.data.emailCriticalOnly,
    },
    {
      channel: "web-push",
      frequency: parsed.data.webPushEnabled ? "daily" : "off",
      critical_only: true,
    },
  ];

  // Clear existing global rows for these channels, then insert the new state.
  // RLS scopes the delete to the calling user automatically.
  const { error: delError } = await supabase
    .from("alert_preferences")
    .delete()
    .is("saved_view_id", null)
    .in("channel", channels.map((c) => c.channel));
  if (delError) return { ok: false, error: delError.message };

  const rows = channels.map((c) => ({
    organization_id: org.organization_id,
    user_id: user.id,
    saved_view_id: null,
    channel: c.channel,
    frequency: c.frequency,
    critical_only: c.critical_only,
    severity_threshold: "critical",
  }));

  const { error: insError } = await supabase.from("alert_preferences").insert(rows);
  if (insError) return { ok: false, error: insError.message };

  revalidatePath("/regwatch/settings/alerts");
  return { ok: true };
}

/**
 * Used by the bell drawer to clear the badge after the user looks at it.
 * Marks every currently-unseen match seen in one batch.
 */
export async function markAllNotificationsSeen(): Promise<SaveAlertPrefsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("footprint_matches")
    .update({ seen_at: new Date().toISOString() })
    .is("seen_at", null)
    .is("resolved_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/feed");
  return { ok: true };
}
