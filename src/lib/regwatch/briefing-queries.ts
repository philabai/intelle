import { createClient } from "./supabase/server";
import type { BriefingCitation } from "./briefing";

/**
 * Server-side reads for the briefing detail page and listings. RLS scopes
 * everything to the calling user's org via impact_briefings.organization_id.
 */

export interface ImpactBriefing {
  id: string;
  headline: string;
  why_it_matters: string;
  details: string;
  what_to_do_now: string;
  deeper_resources: string | null;
  citations: BriefingCitation[];
  trust_markers: { green: number; amber: number; red: number };
  generated_at: string;
  generation_metadata: Record<string, unknown> | null;
  requested_by: string | null;
  item: {
    id: string;
    citation: string;
    slug: string;
    title: string;
    jurisdiction_code: string;
    status: string;
    instrument_type: string;
    effective_date: string | null;
    consultation_closes_at: string | null;
    source_url: string;
    regulator: { slug: string; name: string; short_name: string | null };
  };
}

const BRIEFING_SELECT = `
  id, headline, why_it_matters, details, what_to_do_now, deeper_resources,
  citations, trust_markers, generated_at, generation_metadata, requested_by,
  item:regulatory_items!inner (
    id, citation, slug, title, jurisdiction_code, status, instrument_type,
    effective_date, consultation_closes_at, source_url,
    regulator:regulators!inner ( slug, name, short_name )
  )
`;

function shape(row: Record<string, unknown>): ImpactBriefing {
  const item = (
    Array.isArray((row as { item: unknown }).item)
      ? (row as { item: Array<Record<string, unknown>> }).item[0]
      : (row as { item: Record<string, unknown> }).item
  ) as Record<string, unknown>;
  const reg = (
    Array.isArray((item as { regulator: unknown }).regulator)
      ? (item as { regulator: Array<Record<string, unknown>> }).regulator[0]
      : (item as { regulator: Record<string, unknown> }).regulator
  ) as Record<string, unknown>;
  return {
    id: row.id as string,
    headline: row.headline as string,
    why_it_matters: row.why_it_matters as string,
    details: row.details as string,
    what_to_do_now: row.what_to_do_now as string,
    deeper_resources: (row.deeper_resources as string) ?? null,
    citations: (row.citations as BriefingCitation[]) ?? [],
    trust_markers:
      (row.trust_markers as { green: number; amber: number; red: number }) ?? {
        green: 0,
        amber: 0,
        red: 0,
      },
    generated_at: row.generated_at as string,
    generation_metadata:
      (row.generation_metadata as Record<string, unknown>) ?? null,
    requested_by: (row.requested_by as string) ?? null,
    item: {
      id: item.id as string,
      citation: item.citation as string,
      slug: item.slug as string,
      title: item.title as string,
      jurisdiction_code: item.jurisdiction_code as string,
      status: item.status as string,
      instrument_type: item.instrument_type as string,
      effective_date: (item.effective_date as string) ?? null,
      consultation_closes_at: (item.consultation_closes_at as string) ?? null,
      source_url: item.source_url as string,
      regulator: {
        slug: reg.slug as string,
        name: reg.name as string,
        short_name: (reg.short_name as string) ?? null,
      },
    },
  };
}

export async function getBriefing(id: string): Promise<ImpactBriefing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("impact_briefings")
    .select(BRIEFING_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[regwatch] getBriefing error:", error);
    return null;
  }
  return data ? shape(data) : null;
}

export async function listBriefingsForItem(
  regulatoryItemId: string,
  limit = 5,
): Promise<ImpactBriefing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("impact_briefings")
    .select(BRIEFING_SELECT)
    .eq("regulatory_item_id", regulatoryItemId)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(shape);
}

/**
 * Returns the most-recent existing briefing for this (footprint, item) pair,
 * if any. Used by the Feed action so we can show a "View briefing" button
 * instead of "Generate briefing" when one already exists.
 */
export async function findExistingBriefingForMatch(
  footprintId: string,
  regulatoryItemId: string,
): Promise<{ id: string; generated_at: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("impact_briefings")
    .select("id, generated_at")
    .eq("footprint_id", footprintId)
    .eq("regulatory_item_id", regulatoryItemId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
