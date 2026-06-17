import { createClient } from "@/lib/outreach/supabase/server";
import { SeedsManager } from "@/components/outreach/SeedsManager";

export const metadata = { title: "Seeds — Outreach" };

export default async function OutreachSeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string }>;
}) {
  const { pillar } = await searchParams;
  const supabase = await createClient();

  const [{ data: pillars }, { data: seeds }] = await Promise.all([
    supabase.from("content_pillars").select("id, slug, name, active").order("name"),
    supabase
      .from("content_seeds")
      .select("id, title, summary, source_type, geo_relevance, pillar_id, discovered_at")
      .eq("consumed", false)
      .order("discovered_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-white">Seeds</h1>
      <p className="mt-1 text-sm text-muted">
        Unused content seeds, grouped by pillar. Edit a seed, move it to a different pillar, add your
        own, or delete one. Generation consumes the newest unused seed for a pillar.
      </p>
      <SeedsManager
        pillars={(pillars ?? []).map((p) => ({ id: p.id, slug: p.slug, name: p.name, active: Boolean(p.active) }))}
        seeds={(seeds ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          summary: s.summary,
          sourceType: s.source_type,
          geoRelevance: (s.geo_relevance as string[]) ?? [],
          pillarId: s.pillar_id,
        }))}
        initialPillarSlug={pillar ?? null}
      />
    </div>
  );
}
