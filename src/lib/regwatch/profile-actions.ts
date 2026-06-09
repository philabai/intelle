"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";

/**
 * Profile mutations — writes the user's display name into Supabase
 * auth user_metadata. Mirrors updateMyRole in footprint-actions.ts
 * (same supabase.auth.updateUser({ data }) pattern).
 *
 * The Nav's Account-menu trigger + the profile page both read
 * first_name / full_name from user_metadata, so revalidating those
 * paths makes the new name show up immediately after save.
 */

interface ActionResult {
  ok: boolean;
  error?: string;
}

const schema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
});

export async function updateMyName(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  if (!firstName && !lastName) {
    return { ok: false, error: "Enter at least a first name." };
  }
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
    },
  });
  if (error) return { ok: false, error: error.message };

  // Account menu + profile page both read these from the session.
  revalidatePath("/regwatch/settings/account");
  revalidatePath("/regwatch", "layout");
  return { ok: true };
}
