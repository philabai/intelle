import { NextResponse } from "next/server";
import { createServiceClient as regwatchService } from "@/lib/regwatch/supabase/service";
import { createServiceClient as outreachService } from "@/lib/outreach/supabase/service";
import type { GeoRegion, PillarSlug } from "@/lib/outreach/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pipeline A — seed ingestion. Pulls recently-changed, enriched items from the
 * regwatch corpus and routes each to the right Outreach pillar, then rotates any
 * due topic-calendar entries into seeds. Dedup is enforced by the
 * (source_type, source_reference_id) unique index. Auth: Bearer CRON_SECRET.
 *
 * Pillar routing (the corpus is ~all energy policy, so routing keys off
 * instrument_type + the synthetic news regulators + topic hints, NOT
 * jurisdiction_code which is almost always INT):
 *   - news (instrument_type 'notice' / news-* regulator) -> industry-newsjack,
 *     or mea-compliance when it came from the MEA news source / GCC jurisdiction
 *   - standards (instrument_type 'standard' or standards-ish topics) -> standards-engineering
 *   - everything else -> regulatory-briefings (the default)
 * Demo & long-form pillars aren't fed from regwatch — they come from the
 * topic_calendar rotation below.
 */
const GCC = new Set(["SA", "AE", "QA", "KW", "OM", "BH"]);
const MEA = new Set([...GCC, "EG", "JO", "LB", "IQ", "IL", "TR", "IR", "MA", "DZ", "TN", "LY", "ET", "AO", "NG", "ZA", "KE", "GH"]);
const STANDARDS_TOPICS = new Set(["standards", "process-safety", "bunker-spec", "worker-safety", "construction"]);

function geoFor(jurisdiction: string | null): GeoRegion {
  const j = (jurisdiction ?? "").toUpperCase();
  if (j === "US") return "us";
  if (j === "CA") return "canada";
  if (j === "IN") return "india";
  if (GCC.has(j)) return "gcc";
  return "international";
}

type RoutableItem = {
  id: string;
  citation: string | null;
  title: string | null;
  summary: string | null;
  body_text: string | null;
  instrument_type: string | null;
  jurisdiction_code: string | null;
  topics: string[] | null;
  regulator: { slug: string | null } | { slug: string | null }[] | null;
};

function regulatorSlug(it: RoutableItem): string {
  const r = Array.isArray(it.regulator) ? it.regulator[0] : it.regulator;
  return r?.slug ?? "";
}

function routeFor(it: RoutableItem): { pillar: PillarSlug; sourceType: "regulator_update" | "industry_news" } {
  const slug = regulatorSlug(it);
  const isNews = it.instrument_type === "notice" || slug.startsWith("news-");
  const topics = new Set(it.topics ?? []);
  const j = (it.jurisdiction_code ?? "").toUpperCase();

  if (isNews) {
    const mea = slug === "news-mea" || MEA.has(j) || topics.has("gulf") || topics.has("gcc-alignment");
    return { pillar: mea ? "mea-compliance" : "industry-newsjack", sourceType: "industry_news" };
  }
  if (it.instrument_type === "standard" || [...topics].some((t) => STANDARDS_TOPICS.has(t))) {
    return { pillar: "standards-engineering", sourceType: "regulator_update" };
  }
  return { pillar: "regulatory-briefings", sourceType: "regulator_update" };
}

export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const lookbackDays = Math.min(Number(url.searchParams.get("lookback") ?? 14) || 14, 120);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 40) || 40, 200);
  const since = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();

  const rw = regwatchService();
  const { data: items, error } = await rw
    .from("regulatory_items")
    .select("id, citation, title, summary, body_text, instrument_type, jurisdiction_code, topics, last_changed_at, regulator:regulators(slug)")
    .eq("enrichment_status", "enriched")
    .not("summary", "is", null)
    .gte("last_changed_at", since)
    .order("last_changed_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = outreachService();
  const { data: pillars } = await out.from("content_pillars").select("id, slug");
  const pillarId = new Map<string, string>((pillars ?? []).map((p) => [p.slug as string, p.id as string]));

  const byPillar: Record<string, number> = {};
  for (const raw of (items ?? []) as RoutableItem[]) {
    const { pillar, sourceType } = routeFor(raw);
    const pid = pillarId.get(pillar);
    if (!pid) continue;
    const { error: insErr } = await out.from("content_seeds").insert({
      source_type: sourceType,
      source_reference_id: raw.id,
      title: raw.title ?? raw.citation ?? "Update",
      summary: raw.summary ?? "",
      raw_content: raw.body_text ?? null,
      pillar_id: pid,
      geo_relevance: [geoFor(raw.jurisdiction_code)],
    });
    if (!insErr) byPillar[pillar] = (byPillar[pillar] ?? 0) + 1;
    else if (insErr.code !== "23505") console.warn("[outreach-seeds] insert failed:", insErr.message);
  }

  // ---- Topic-calendar rotation: evergreen prompts -> seeds (demo/long-form) --
  let topicCalendar = 0;
  try {
    topicCalendar = await rotateTopicCalendar(out);
  } catch (e) {
    console.warn("[outreach-seeds] topic-calendar skipped:", (e as Error).message);
  }

  return NextResponse.json({
    ok: true,
    scanned: items?.length ?? 0,
    seeded_by_pillar: byPillar,
    topic_calendar_seeded: topicCalendar,
  });
}

/** Pick active topic-calendar entries whose cadence has elapsed and turn each
 * into a fresh content_seed, stamping last_used_at so it won't re-fire until
 * the next cadence window. Tolerates the table not existing yet. */
async function rotateTopicCalendar(out: ReturnType<typeof outreachService>): Promise<number> {
  const { data: entries, error } = await out
    .from("topic_calendar")
    .select("id, pillar_id, title, angle, geo, cadence_days, last_used_at")
    .eq("active", true);
  if (error) throw new Error(error.message);

  const now = Date.now();
  let seeded = 0;
  for (const e of entries ?? []) {
    const due = !e.last_used_at || now - new Date(e.last_used_at as string).getTime() >= (Number(e.cadence_days) || 30) * 86_400_000;
    if (!due) continue;
    const { error: insErr } = await out.from("content_seeds").insert({
      source_type: "topic_calendar",
      source_reference_id: null,
      title: e.title,
      summary: e.angle ?? e.title,
      pillar_id: e.pillar_id,
      geo_relevance: (e.geo as string[]) ?? ["international"],
    });
    if (insErr) continue;
    await out.from("topic_calendar").update({ last_used_at: new Date().toISOString() }).eq("id", e.id);
    seeded += 1;
  }
  return seeded;
}
