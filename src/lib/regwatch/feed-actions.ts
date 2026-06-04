"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { runMatchPipeline } from "./match-pipeline";

/**
 * User-facing Feed mutations. All run through the SSR client so RLS scopes
 * each operation to the calling user's org. The pipeline writes via service
 * role; only mark-seen / mark-resolved / undo happen here.
 */

const idSchema = z.object({ matchId: z.string().uuid() });

export interface FeedActionResult {
  ok: boolean;
  error?: string;
}

export async function markSeen(input: unknown): Promise<FeedActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid match id" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("footprint_matches")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", parsed.data.matchId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/feed");
  return { ok: true };
}

export async function markResolved(input: unknown): Promise<FeedActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid match id" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("footprint_matches")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", parsed.data.matchId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/feed");
  return { ok: true };
}

export async function undoResolved(input: unknown): Promise<FeedActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid match id" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("footprint_matches")
    .update({ resolved_at: null })
    .eq("id", parsed.data.matchId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/feed");
  return { ok: true };
}

/**
 * Triggers a rescore of the calling user's footprint. Verifies the caller
 * owns the footprint (RLS ensures this — the SSR client only sees their own
 * row), then hands off to the service-role pipeline narrowed to that single
 * footprint. Called after the user saves the configurator so the Feed reflects
 * new choices immediately rather than waiting for the next cron tick.
 */
export async function rematchMyFootprint(): Promise<FeedActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: fp, error: fpError } = await supabase
    .from("operations_footprints")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (fpError) return { ok: false, error: fpError.message };
  if (!fp) return { ok: false, error: "No footprint to rematch" };

  try {
    await runMatchPipeline({ footprintId: fp.id, itemsSinceDays: 365 });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/regwatch/feed");
  return { ok: true };
}
