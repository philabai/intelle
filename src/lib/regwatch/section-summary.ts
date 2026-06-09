import { createServiceClient } from "./supabase/service";

/**
 * Section detail support — the small in-app page a CFR section links to before
 * the user deep-links into eCFR.
 *
 * Sections live in regwatch.regulatory_sections (navigation tree), NOT in
 * regulatory_items, so they have no stored body. We fetch a short excerpt of
 * the real regulatory text on demand from the eCFR "full content" API, which
 * returns a tiny XML per section (heading + paragraphs). Next's fetch cache
 * (revalidate daily) means we hit eCFR at most once per section per day — no
 * DB column, no bulk ingest of 5k section bodies.
 */

export interface SectionDetail {
  id: string;
  jurisdictionCode: string;
  levelLabel: string;
  identifier: string;
  title: string | null;
  citation: string | null;
  sourceUrl: string | null;
  path: string;
}

interface SectionRow {
  id: string;
  jurisdiction_code: string;
  level_label: string;
  identifier: string;
  title: string | null;
  citation: string | null;
  source_url: string | null;
  path: string;
}

export async function getSectionById(id: string): Promise<SectionDetail | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("regulatory_sections")
    .select(
      "id, jurisdiction_code, level_label, identifier, title, citation, source_url, path",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as SectionRow;
  return {
    id: r.id,
    jurisdictionCode: r.jurisdiction_code,
    levelLabel: r.level_label,
    identifier: r.identifier,
    title: r.title,
    citation: r.citation,
    sourceUrl: r.source_url,
    path: r.path,
  };
}

const ECFR_USER_AGENT =
  "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";

interface TitleMeta {
  number: number;
  latest_issue_date?: string;
  up_to_date_as_of?: string;
}

async function ecfrTitleDate(titleNumber: number): Promise<string | null> {
  try {
    const res = await fetch("https://www.ecfr.gov/api/versioner/v1/titles.json", {
      headers: { "User-Agent": ECFR_USER_AGENT, Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { titles?: TitleMeta[] };
    const t = (data.titles ?? []).find((x) => x.number === titleNumber);
    return t?.latest_issue_date ?? t?.up_to_date_as_of ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch a short plain-text excerpt (the opening paragraph(s)) of an eCFR
 * section. Returns null for non-eCFR sections, appendices without a section
 * identifier, or on any fetch/parse failure — the page degrades to heading +
 * source link.
 */
export async function getEcfrSectionExcerpt(
  section: SectionDetail,
  maxChars = 600,
): Promise<string | null> {
  // Only eCFR (US CFR) sections can be resolved this way.
  const titleMatch = section.path.match(/title_(\d+)/);
  const sectionMatch = section.sourceUrl?.match(/\/section-([^/?#]+)/);
  if (!titleMatch || !sectionMatch) return null;

  const titleNumber = Number(titleMatch[1]);
  const sectionId = decodeURIComponent(sectionMatch[1]); // e.g. "50.1"
  const partId = sectionId.split(".")[0]; // e.g. "50"

  const date = await ecfrTitleDate(titleNumber);
  if (!date) return null;

  const url =
    `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${titleNumber}.xml` +
    `?part=${encodeURIComponent(partId)}&section=${encodeURIComponent(sectionId)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": ECFR_USER_AGENT, Accept: "application/xml" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return extractExcerpt(xml, maxChars);
  } catch {
    return null;
  }
}

function extractExcerpt(xml: string, maxChars: number): string | null {
  // Prefer the first real paragraph; fall back to all body text minus the HEAD.
  const paras = [...xml.matchAll(/<P\b[^>]*>([\s\S]*?)<\/P>/gi)].map((m) =>
    stripText(m[1]),
  );
  let text = paras.find((p) => p.length > 0) ?? "";
  if (!text) {
    text = stripText(
      xml
        .replace(/<HEAD>[\s\S]*?<\/HEAD>/gi, " ")
        .replace(/<CITA[\s\S]*?<\/CITA>/gi, " "),
    );
  }
  if (!text) return null;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
  }
  return text;
}

function stripText(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#167;/g, "§")
    .replace(/&#8201;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
