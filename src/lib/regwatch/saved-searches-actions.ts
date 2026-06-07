"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { getMyMembership } from "./members";

/**
 * Write-side actions for saved searches. Inserts via the user client
 * so RLS proves ownership; the schema's unique (user_id, lower(query))
 * index makes re-save idempotent — we upsert the timestamps + label
 * instead of creating duplicates.
 */

interface ActionResult {
  ok: boolean;
  error?: string;
  savedSearchId?: string;
}

const saveSchema = z.object({
  query: z.string().trim().min(2).max(1500),
  label: z.string().trim().max(120).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  resultCountAtSave: z.number().int().nonnegative().optional(),
});

export async function saveSearch(input: unknown): Promise<ActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getMyMembership();

  const { data, error } = await supabase
    .from("saved_searches")
    .upsert(
      {
        user_id: user.id,
        organization_id: membership?.organizationId ?? null,
        query: parsed.data.query,
        label: parsed.data.label ?? null,
        filters: parsed.data.filters ?? {},
        result_count_at_save: parsed.data.resultCountAtSave ?? null,
        last_run_at: new Date().toISOString(),
      },
      { onConflict: "user_id,query" },
    )
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Save failed" };
  }
  revalidatePath("/regwatch/saved");
  revalidatePath("/regwatch/search");
  return { ok: true, savedSearchId: data.id as string };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteSavedSearch(input: unknown): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/saved");
  return { ok: true };
}

const renameSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().max(120),
});

export async function renameSavedSearch(input: unknown): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("saved_searches")
    .update({ label: parsed.data.label || null })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/saved");
  return { ok: true };
}
