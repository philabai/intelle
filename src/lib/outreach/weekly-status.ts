import { createServiceClient } from "@/lib/outreach/supabase/service";

/**
 * Weekly pillar quota status. For each pillar: its weekly target, how many
 * posts are already "in motion" this week (anything past draft that hasn't been
 * rejected/failed), the remaining gap, and how many unused seeds are available
 * to close it. Powers the Generation page tracker and the Pillars page.
 *
 * Week window = Monday 00:00 UTC → next Monday (matches a typical content week).
 */

// Posts that count as "done or in progress" toward the weekly target.
export const FUNNEL_STATUSES = [
  "pending_review",
  "under_review",
  "approved",
  "scheduled",
  "publishing",
  "published",
] as const;

export interface PillarWeekStatus {
  id: string;
  slug: string;
  name: string;
  description: string;
  editorialVoiceNotes: string | null;
  active: boolean;
  weeklyTarget: number;
  thisWeek: number;
  remaining: number;
  seedsAvailable: number;
}

export interface WeeklyStatus {
  weekStart: string;
  weekEnd: string;
  pillars: PillarWeekStatus[];
}

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStartUTC(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export async function getWeeklyPillarStatus(): Promise<WeeklyStatus> {
  const svc = createServiceClient();
  const start = weekStartUTC();
  const end = new Date(start.getTime() + 7 * 86_400_000);

  const [{ data: pillars }, { data: posts }, { data: seeds }] = await Promise.all([
    svc.from("content_pillars").select("id, slug, name, description, editorial_voice_notes, active, weekly_post_target").order("name"),
    svc.from("posts").select("pillar_id, status, created_at").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
    svc.from("content_seeds").select("pillar_id").eq("consumed", false),
  ]);

  const funnel = new Set<string>(FUNNEL_STATUSES);
  const doneByPillar = new Map<string, number>();
  for (const p of posts ?? []) {
    if (!p.pillar_id || !funnel.has(p.status as string)) continue;
    doneByPillar.set(p.pillar_id, (doneByPillar.get(p.pillar_id) ?? 0) + 1);
  }
  const seedsByPillar = new Map<string, number>();
  for (const s of seeds ?? []) {
    if (s.pillar_id) seedsByPillar.set(s.pillar_id, (seedsByPillar.get(s.pillar_id) ?? 0) + 1);
  }

  const rows: PillarWeekStatus[] = (pillars ?? []).map((p) => {
    const target = Number(p.weekly_post_target) || 0;
    const thisWeek = doneByPillar.get(p.id) ?? 0;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      editorialVoiceNotes: p.editorial_voice_notes ?? null,
      active: Boolean(p.active),
      weeklyTarget: target,
      thisWeek,
      remaining: Math.max(0, target - thisWeek),
      seedsAvailable: seedsByPillar.get(p.id) ?? 0,
    };
  });

  return { weekStart: start.toISOString(), weekEnd: end.toISOString(), pillars: rows };
}
