import { NextResponse } from "next/server";
import { createServiceClient as regwatchService } from "@/lib/regwatch/supabase/service";
import { createServiceClient as outreachService } from "@/lib/outreach/supabase/service";
import type { GeoRegion } from "@/lib/outreach/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pipeline A — seed ingestion. Pulls recently-changed, enriched regulatory items
 * from the regwatch corpus and turns them into outreach.content_seeds for the
 * Regulatory Briefings pillar. Dedup is enforced by the (source_type,
 * source_reference_id) unique index. Auth: Bearer CRON_SECRET.
 * (Industry-news RSS + Haiku relevance tagging are deferred to Phase 2.)
 */
const GCC = new Set(["SA", "AE", "QA", "KW", "OM", "BH"]);
function geoFor(jurisdiction: string | null): GeoRegion {
  const j = (jurisdiction ?? "").toUpperCase();
  if (j === "US") return "us";
  if (j === "CA") return "canada";
  if (j === "IN") return "india";
  if (GCC.has(j)) return "gcc";
  return "international";
}

export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const lookbackDays = Math.min(Number(url.searchParams.get("lookback") ?? 14) || 14, 90);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100);
  const since = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();

  const rw = regwatchService();
  const { data: items, error } = await rw
    .from("regulatory_items")
    .select("id, citation, title, summary, body_text, status, jurisdiction_code, topics, source_url, last_changed_at")
    .eq("enrichment_status", "enriched")
    .not("summary", "is", null)
    .gte("last_changed_at", since)
    .order("last_changed_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = outreachService();
  const { data: pillar } = await out
    .from("content_pillars")
    .select("id")
    .eq("slug", "regulatory-briefings")
    .single();
  if (!pillar) return NextResponse.json({ error: "regulatory-briefings pillar missing" }, { status: 500 });

  let inserted = 0;
  for (const it of items ?? []) {
    const { error: insErr } = await out.from("content_seeds").insert({
      source_type: "regulator_update",
      source_reference_id: it.id,
      title: it.title ?? it.citation ?? "Regulatory update",
      summary: it.summary ?? "",
      raw_content: it.body_text ?? null,
      pillar_id: pillar.id,
      geo_relevance: [geoFor(it.jurisdiction_code)],
    });
    // 23505 = unique violation (already seeded) — expected, skip quietly.
    if (!insErr) inserted += 1;
    else if (insErr.code !== "23505") {
      console.warn("[outreach-seeds] insert failed:", insErr.message);
    }
  }

  return NextResponse.json({ ok: true, scanned: items?.length ?? 0, inserted });
}
