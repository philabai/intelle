import { createServiceClient } from "./supabase/service";

/**
 * Corpus-wide weekly recap — the public/ungated digest of what changed across
 * the whole regulatory corpus in the last N days. Used on /regwatch/recap for
 * logged-out visitors (SEO + lead gen) and as a fallback for authed users who
 * haven't configured a footprint yet. Reads global corpus data via the
 * service client (regulatory_items is public-read content).
 */

export interface RecapItem {
  citation: string;
  title: string;
  slug: string;
  jurisdiction_code: string;
  status: string;
  last_changed_at: string;
  regulator_name: string | null;
}

export interface CorpusRecap {
  days: number;
  total: number;
  byJurisdiction: { code: string; count: number }[];
  items: RecapItem[];
}

export async function getCorpusRecap(days = 7): Promise<CorpusRecap> {
  const svc = createServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .gte("last_changed_at", since);

  const { data } = await svc
    .from("regulatory_items")
    .select(
      "citation, title, slug, jurisdiction_code, status, last_changed_at, regulator:regulators!inner ( name, short_name )",
    )
    .gte("last_changed_at", since)
    .order("last_changed_at", { ascending: false })
    .limit(1000);

  const rows: RecapItem[] = (data ?? []).map((r) => {
    const reg = Array.isArray(r.regulator) ? r.regulator[0] : r.regulator;
    return {
      citation: r.citation as string,
      title: r.title as string,
      slug: r.slug as string,
      jurisdiction_code: r.jurisdiction_code as string,
      status: r.status as string,
      last_changed_at: r.last_changed_at as string,
      regulator_name: (reg?.short_name ?? reg?.name ?? null) as string | null,
    };
  });

  const jMap = new Map<string, number>();
  for (const r of rows) jMap.set(r.jurisdiction_code, (jMap.get(r.jurisdiction_code) ?? 0) + 1);
  const byJurisdiction = Array.from(jMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return { days, total: count ?? rows.length, byJurisdiction, items: rows.slice(0, 12) };
}
