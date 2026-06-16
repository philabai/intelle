import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/outreach/supabase/service";
import { generatePost } from "@/lib/outreach/generate";
import type { GeoRegion, Platform } from "@/lib/outreach/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Pipeline B — draft generation for one pillar. Picks the next unconsumed seed
 * for the pillar, generates a post (long-form + LinkedIn/X variants, quality-
 * checked), and persists it as pending_review. Auth: Bearer CRON_SECRET.
 */
export async function GET(request: Request, { params }: { params: Promise<{ pillar: string }> }) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { pillar: pillarSlug } = await params;
  const url = new URL(request.url);
  const count = Math.min(Number(url.searchParams.get("count") ?? 1) || 1, 5);

  const svc = createServiceClient();
  const { data: pillar } = await svc
    .from("content_pillars")
    .select("id, name, slug, editorial_voice_notes, active")
    .eq("slug", pillarSlug)
    .single();
  if (!pillar) return NextResponse.json({ error: `unknown pillar: ${pillarSlug}` }, { status: 404 });
  if (!pillar.active) return NextResponse.json({ ok: true, skipped: "pillar inactive" });

  const generated: string[] = [];
  for (let i = 0; i < count; i++) {
    const { data: seed } = await svc
      .from("content_seeds")
      .select("id, title, summary, source_reference_id, geo_relevance")
      .eq("pillar_id", pillar.id)
      .eq("consumed", false)
      .order("discovered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!seed) break;

    // Resolve the source citation/url from the regwatch item when present.
    let seedCitation: string | null = null;
    let seedSourceUrl: string | null = null;
    if (seed.source_reference_id) {
      const { createServiceClient: rwService } = await import("@/lib/regwatch/supabase/service");
      const { data: item } = await rwService()
        .from("regulatory_items")
        .select("citation, source_url")
        .eq("id", seed.source_reference_id)
        .maybeSingle();
      seedCitation = item?.citation ?? null;
      seedSourceUrl = item?.source_url ?? null;
    }

    const geos = ((seed.geo_relevance as GeoRegion[]) ?? []).length
      ? (seed.geo_relevance as GeoRegion[])
      : (["international"] as GeoRegion[]);

    try {
      const postId = await generatePost({
        pillarId: pillar.id,
        pillarName: pillar.name,
        pillarVoiceNotes: pillar.editorial_voice_notes,
        seedId: seed.id,
        seedTitle: seed.title,
        seedSummary: seed.summary,
        seedCitation,
        seedSourceUrl,
        targetPlatforms: ["linkedin", "x"] as Platform[],
        targetGeos: geos,
      });
      generated.push(postId);
    } catch (e) {
      console.error("[outreach-generate] generation failed:", (e as Error).message);
      break;
    }
  }

  return NextResponse.json({ ok: true, pillar: pillarSlug, generated });
}
