"use server";

import { revalidatePath } from "next/cache";
import { canManageContent, getSessionUser } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/outreach/supabase/service";
import { generatePost } from "@/lib/outreach/generate";
import { recordOutreachAudit } from "@/lib/outreach/audit";
import type { GeoRegion, Platform } from "@/lib/outreach/types";

export type ActionResult = { ok: true; postId?: string } | { ok: false; error: string };

async function ensureAdmin() {
  const user = await getSessionUser();
  if (!user || !canManageContent(user)) return null;
  return user;
}

export type MutationResult = { ok: true; id?: string } | { ok: false; error: string };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// ---- Content pillars -------------------------------------------------------

export async function updatePillar(input: {
  pillarId: string;
  name?: string;
  description?: string;
  editorialVoiceNotes?: string | null;
  weeklyPostTarget?: number;
  active?: boolean;
}): Promise<MutationResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.editorialVoiceNotes !== undefined) patch.editorial_voice_notes = input.editorialVoiceNotes;
  if (input.weeklyPostTarget !== undefined) patch.weekly_post_target = Math.max(0, Math.min(50, Math.floor(input.weeklyPostTarget)));
  if (input.active !== undefined) patch.active = input.active;
  if (Object.keys(patch).length === 0) return { ok: true, id: input.pillarId };

  const { error } = await createServiceClient().from("content_pillars").update(patch).eq("id", input.pillarId);
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({ actorId: user.id, action: "pillar.updated", targetType: "pillar", targetId: input.pillarId, metadata: patch });
  revalidatePath("/outreach/pillars");
  revalidatePath("/outreach/generate");
  return { ok: true, id: input.pillarId };
}

export async function createPillar(input: {
  name: string;
  description?: string;
  editorialVoiceNotes?: string;
  weeklyPostTarget?: number;
}): Promise<MutationResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  const svc = createServiceClient();
  const slug = slugify(input.name);
  const { data, error } = await svc
    .from("content_pillars")
    .insert({
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || input.name.trim(),
      editorial_voice_notes: input.editorialVoiceNotes?.trim() || null,
      weekly_post_target: Math.max(0, Math.min(50, Math.floor(input.weeklyPostTarget ?? 0))),
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? `A pillar with slug "${slug}" already exists` : error.message };
  await recordOutreachAudit({ actorId: user.id, action: "pillar.created", targetType: "pillar", targetId: data.id, metadata: { slug } });
  revalidatePath("/outreach/pillars");
  revalidatePath("/outreach/generate");
  return { ok: true, id: data.id };
}

// ---- Content seeds ---------------------------------------------------------

export async function updateSeed(input: {
  seedId: string;
  title?: string;
  summary?: string;
  geoRelevance?: GeoRegion[];
  pillarId?: string;
}): Promise<MutationResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.geoRelevance !== undefined) patch.geo_relevance = input.geoRelevance;
  if (input.pillarId !== undefined) patch.pillar_id = input.pillarId;
  if (Object.keys(patch).length === 0) return { ok: true, id: input.seedId };

  const { error } = await createServiceClient().from("content_seeds").update(patch).eq("id", input.seedId);
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({ actorId: user.id, action: "seed.updated", targetType: "seed", targetId: input.seedId, metadata: patch });
  revalidatePath("/outreach/seeds");
  revalidatePath("/outreach/generate");
  return { ok: true, id: input.seedId };
}

export async function createSeed(input: {
  pillarId: string;
  title: string;
  summary: string;
  geoRelevance?: GeoRegion[];
}): Promise<MutationResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!input.title.trim()) return { ok: false, error: "Title is required" };
  const { data, error } = await createServiceClient()
    .from("content_seeds")
    .insert({
      source_type: "manual",
      source_reference_id: null,
      title: input.title.trim(),
      summary: input.summary.trim() || input.title.trim(),
      pillar_id: input.pillarId,
      geo_relevance: input.geoRelevance?.length ? input.geoRelevance : ["international"],
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({ actorId: user.id, action: "seed.created", targetType: "seed", targetId: data.id, metadata: { pillarId: input.pillarId } });
  revalidatePath("/outreach/seeds");
  revalidatePath("/outreach/generate");
  return { ok: true, id: data.id };
}

export async function deleteSeed(input: { seedId: string }): Promise<MutationResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const { error } = await createServiceClient().from("content_seeds").delete().eq("id", input.seedId);
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({ actorId: user.id, action: "seed.deleted", targetType: "seed", targetId: input.seedId });
  revalidatePath("/outreach/seeds");
  revalidatePath("/outreach/generate");
  return { ok: true };
}

/** Save editor changes to a draft (bodies, hashtags, citations). */
export async function savePostEdits(input: {
  postId: string;
  body_long?: string;
  body_medium?: string;
  body_short?: string;
  body_thread?: string[];
  hashtags?: string[];
  title?: string;
}): Promise<ActionResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const svc = createServiceClient();
  const { data: existing } = await svc.from("posts").select("edit_history").eq("id", input.postId).single();
  const history = Array.isArray(existing?.edit_history) ? existing!.edit_history : [];
  const { error } = await svc
    .from("posts")
    .update({
      title: input.title,
      body_long: input.body_long,
      body_medium: input.body_medium,
      body_short: input.body_short,
      body_thread: input.body_thread,
      hashtags: input.hashtags,
      edit_history: [...history, { at: new Date().toISOString(), event: "edited", by: user.id }],
    })
    .eq("id", input.postId);
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({ actorId: user.id, action: "post.edited", targetType: "post", targetId: input.postId });
  revalidatePath(`/outreach/posts/${input.postId}`);
  return { ok: true };
}

/** Approve + schedule (or schedule for now to publish on the next cron tick). */
export async function approvePost(input: { postId: string; scheduledFor: string }): Promise<ActionResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const svc = createServiceClient();
  const { error } = await svc
    .from("posts")
    .update({
      status: "approved",
      scheduled_for: input.scheduledFor,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.postId);
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({
    actorId: user.id, action: "post.approved", targetType: "post", targetId: input.postId,
    metadata: { scheduledFor: input.scheduledFor },
  });
  revalidatePath("/outreach/queue");
  return { ok: true };
}

export async function rejectPost(input: { postId: string; reason: string }): Promise<ActionResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  if (!input.reason.trim()) return { ok: false, error: "A rejection reason is required" };
  const svc = createServiceClient();
  const { error } = await svc
    .from("posts")
    .update({ status: "rejected", rejection_reason: input.reason, reviewer_id: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", input.postId);
  if (error) return { ok: false, error: error.message };
  await recordOutreachAudit({
    actorId: user.id, action: "post.rejected", targetType: "post", targetId: input.postId,
    metadata: { reason: input.reason },
  });
  revalidatePath("/outreach/queue");
  return { ok: true };
}

/** On-demand generation from the Generate workspace. Drafts a post for a pillar,
 * optionally consuming the next unused seed and/or applying a free-text brief. */
export async function generateOnDemand(input: {
  pillarId: string;
  brief?: string;
  useSeed?: boolean;
  targetPlatforms?: Platform[];
  targetGeos?: GeoRegion[];
}): Promise<ActionResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const svc = createServiceClient();

  const { data: pillar } = await svc
    .from("content_pillars").select("id, name, editorial_voice_notes, active").eq("id", input.pillarId).single();
  if (!pillar) return { ok: false, error: "Pillar not found" };

  let seedId: string | null = null;
  let seedTitle: string | undefined, seedSummary: string | undefined;
  let seedCitation: string | null = null, seedSourceUrl: string | null = null;
  let seedGeos: GeoRegion[] = [];
  if (input.useSeed !== false) {
    const { data: seed } = await svc
      .from("content_seeds")
      .select("id, title, summary, source_reference_id, geo_relevance")
      .eq("pillar_id", pillar.id)
      .eq("consumed", false)
      .order("discovered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (seed) {
      seedId = seed.id; seedTitle = seed.title; seedSummary = seed.summary;
      seedGeos = (seed.geo_relevance as GeoRegion[]) ?? [];
      if (seed.source_reference_id) {
        const { createServiceClient: rw } = await import("@/lib/regwatch/supabase/service");
        const { data: item } = await rw().from("regulatory_items").select("citation, source_url").eq("id", seed.source_reference_id).maybeSingle();
        seedCitation = item?.citation ?? null; seedSourceUrl = item?.source_url ?? null;
      }
    } else if (!input.brief?.trim()) {
      return { ok: false, error: "No unused seed for this pillar — add a brief to generate without one." };
    }
  }

  const geos = (input.targetGeos?.length ? input.targetGeos : seedGeos.length ? seedGeos : ["international"]) as GeoRegion[];

  try {
    const newId = await generatePost({
      pillarId: pillar.id, pillarName: pillar.name, pillarVoiceNotes: pillar.editorial_voice_notes,
      seedId, seedTitle, seedSummary, seedCitation, seedSourceUrl,
      brief: input.brief?.trim() || undefined,
      targetPlatforms: input.targetPlatforms?.length ? input.targetPlatforms : ["linkedin", "x"],
      targetGeos: geos,
      actorId: user.id,
    });
    revalidatePath("/outreach/queue");
    return { ok: true, postId: newId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Regenerate: produce a fresh draft from the same seed+pillar (optional
 * guidance), and supersede the current one. Returns the new post id. */
export async function regeneratePost(input: { postId: string; guidance?: string }): Promise<ActionResult> {
  const user = await ensureAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const svc = createServiceClient();
  const { data: post } = await svc
    .from("posts")
    .select("id, pillar_id, seed_id, target_platforms, target_geos, target_personas")
    .eq("id", input.postId)
    .single();
  if (!post) return { ok: false, error: "Post not found" };
  const { data: pillar } = await svc
    .from("content_pillars").select("id, name, editorial_voice_notes").eq("id", post.pillar_id).single();
  if (!pillar) return { ok: false, error: "Pillar not found" };

  let seedTitle: string | undefined, seedSummary: string | undefined, seedCitation: string | null = null, seedSourceUrl: string | null = null;
  if (post.seed_id) {
    const { data: seed } = await svc.from("content_seeds").select("title, summary, source_reference_id").eq("id", post.seed_id).maybeSingle();
    seedTitle = seed?.title; seedSummary = seed?.summary;
    if (seed?.source_reference_id) {
      const { createServiceClient: rw } = await import("@/lib/regwatch/supabase/service");
      const { data: item } = await rw().from("regulatory_items").select("citation, source_url").eq("id", seed.source_reference_id).maybeSingle();
      seedCitation = item?.citation ?? null; seedSourceUrl = item?.source_url ?? null;
    }
  }

  try {
    // Allow regenerating from the same already-consumed seed.
    if (post.seed_id) await svc.from("content_seeds").update({ consumed: false }).eq("id", post.seed_id);
    const newId = await generatePost({
      pillarId: pillar.id, pillarName: pillar.name, pillarVoiceNotes: pillar.editorial_voice_notes,
      seedId: post.seed_id, seedTitle, seedSummary, seedCitation, seedSourceUrl,
      brief: input.guidance,
      targetPlatforms: (post.target_platforms as Platform[]) ?? ["linkedin", "x"],
      targetGeos: (post.target_geos as GeoRegion[]) ?? ["international"],
      targetPersonas: post.target_personas as string[] | undefined,
      actorId: user.id,
    });
    await svc.from("posts").update({ status: "rejected", rejection_reason: "superseded by regeneration" }).eq("id", input.postId);
    await recordOutreachAudit({ actorId: user.id, action: "post.regenerated", targetType: "post", targetId: input.postId, metadata: { newPostId: newId } });
    revalidatePath("/outreach/queue");
    return { ok: true, postId: newId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
