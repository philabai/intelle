import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  NormalisedItem,
} from "./types";

/**
 * IEA Policies database connector.
 *
 * The IEA catalogues ~13k government energy policies worldwide at
 * https://www.iea.org/policies, served as one JSON array from the public
 * v3 API. We ingest the **in-force** policies as `instrument_type: "policy"`
 * regulatory_items under the int-iea regulator, mirroring the IEA's own
 * filterable list view (browse by topic/status/search in-app).
 *
 * Because the API returns the whole catalogue (~20 MB) in a single response,
 * this connector is intentionally kept OUT of the every-15-minutes crawl loop
 * (see connectors/index.ts) and is instead refreshed by a dedicated daily cron
 * (`/api/cron/regwatch-crawl?only=iea-policies&lookback=30`). The one-time
 * backfill of all ~10k in-force policies runs via scripts/regwatch-iea-ingest.ts
 * which calls buildIeaInForceItems() directly (no lookback filter).
 */

const API = "https://api.iea.org/v3/policies";
const UA =
  "vantage-intelle/1.0 (compliance corpus mirror; +https://intelle.io)";
const REGULATOR_SLUG = "int-iea";

interface IeaPolicy {
  policyId: string;
  title: string;
  description: string | null;
  status: string | null;
  year: number | null;
  jurisdiction: string | null;
  datePromulgated: string | null;
  yearEnded: number | null;
  mandatory: string | null;
  learnMore: string | null;
  dateModified: string | null;
  countries: { iso3: string; name: string }[];
  technologies: string[];
  topics: string[];
}

/** Map an IEA topic label to our internal topic taxonomy slugs. */
const TOPIC_MAP: Record<string, string[]> = {
  "Methane abatement": ["methane", "emissions"],
  Power: ["power", "energy"],
  Fuels: ["fuels", "energy"],
  Industry: ["industry"],
  Buildings: ["buildings", "energy-efficiency"],
  Transport: ["transport"],
  "Critical Minerals": ["critical-minerals"],
  "Economy-wide": ["energy"],
  "Just and Inclusive Energy Transitions": ["energy-transition"],
  "Technology R&D and innovation": ["innovation"],
};

function mapTopics(p: IeaPolicy): string[] {
  const out = new Set<string>(["energy"]);
  for (const t of p.topics ?? []) {
    for (const slug of TOPIC_MAP[t] ?? []) out.add(slug);
  }
  for (const tech of p.technologies ?? []) {
    const x = tech.toLowerCase();
    if (/solar|wind|renewable|geotherm|hydro(?!gen)|biomass|biogas/.test(x))
      out.add("renewables");
    if (/nuclear/.test(x)) out.add("nuclear");
    if (/efficien/.test(x)) out.add("energy-efficiency");
  }
  return Array.from(out);
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m] ?? m);
}

/** Strip HTML to clean plain text, preserving paragraph breaks. */
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
      .replace(/<br\s*\/?>(?=)/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Collapse whitespace; title-case a fully-uppercase title for readability. */
function cleanTitle(raw: string): string {
  let t = decodeEntities(raw).replace(/\s+/g, " ").trim();
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 3 && t === t.toUpperCase()) {
    t = t
      .toLowerCase()
      .replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase());
  }
  return t;
}

function buildBodyHtml(p: IeaPolicy, bodyText: string): string {
  const country = p.countries?.[0]?.name ?? p.jurisdiction ?? "—";
  const meta = [
    `<strong>Country / jurisdiction:</strong> ${esc(country)}`,
    p.year ? `<strong>Year:</strong> ${p.year}` : null,
    p.status ? `<strong>Status:</strong> ${esc(p.status)}` : null,
    p.jurisdiction ? `<strong>Level:</strong> ${esc(p.jurisdiction)}` : null,
    `<strong>Type:</strong> ${p.mandatory === "1" ? "Mandatory" : "Voluntary"}`,
  ]
    .filter(Boolean)
    .join(" &middot; ");
  const paras = bodyText
    .split(/\n{1,}/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1)
    .map((x) => `<p>${esc(x)}</p>`)
    .join("\n");
  const learn = p.learnMore
    ? `\n<p><strong>Official source:</strong> <a href="${esc(
        p.learnMore,
      )}" target="_blank" rel="noopener noreferrer">${esc(p.learnMore)}</a></p>`
    : "";
  return `<p class="text-muted">${meta}</p>\n${paras}${learn}`;
}

function mapPolicy(p: IeaPolicy, citation: string): NormalisedItem {
  const title = cleanTitle(p.title);
  const bodyText = p.description ? htmlToText(p.description) : "";
  const summary =
    bodyText.length > 0
      ? bodyText.slice(0, 280).replace(/\s+\S*$/, "") +
        (bodyText.length > 280 ? "…" : "")
      : null;
  const publishedIso = p.year
    ? `${p.year}-01-01T00:00:00.000Z`
    : p.dateModified ?? new Date(0).toISOString();
  const lastChanged = p.dateModified ?? publishedIso;
  return {
    regulator_slug: REGULATOR_SLUG,
    citation,
    slug: `iea-policy-${p.policyId}`,
    title,
    instrument_type: "policy",
    status: "in-force",
    effective_date: p.year ? `${p.year}-01-01` : null,
    proposed_date: null,
    consultation_closes_at: null,
    published_at: publishedIso,
    last_changed_at: lastChanged,
    source_url: `https://www.iea.org/policies/${p.policyId}`,
    summary,
    body_text: bodyText || null,
    body_html: bodyText ? buildBodyHtml(p, bodyText) : null,
    jurisdiction_code: "INT",
    topics: mapTopics(p),
  };
}

/**
 * Deterministically assign a unique, human-readable citation to each policy.
 * Base form is "{Country} · {Title}". Collisions fall back to appending the
 * year, then the IEA policy id (always unique). Sorted by numeric policyId so
 * the assignment is stable across re-runs (the citation is the upsert key).
 */
function assignCitations(policies: IeaPolicy[]): Map<string, string> {
  const sorted = [...policies].sort(
    (a, b) => Number(a.policyId) - Number(b.policyId),
  );
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const p of sorted) {
    const title = cleanTitle(p.title);
    const country = p.countries?.[0]?.name;
    const base = country ? `${country} · ${title}` : title;
    let citation = base;
    if (used.has(citation) && p.year) citation = `${base} (${p.year})`;
    if (used.has(citation)) citation = `${base} (IEA #${p.policyId})`;
    used.add(citation);
    out.set(p.policyId, citation);
  }
  return out;
}

export async function fetchIeaPolicies(): Promise<IeaPolicy[]> {
  const res = await fetch(API, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`IEA API HTTP ${res.status}`);
  const data = (await res.json()) as IeaPolicy[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch the IEA catalogue and return all **in-force** policies as normalised
 * items, with deterministic deduped citations computed over the full set.
 * Used both by the connector (then lookback-filtered) and the backfill script.
 */
export async function buildIeaInForceItems(): Promise<NormalisedItem[]> {
  const all = await fetchIeaPolicies();
  const inForce = all.filter(
    (p) => (p.status ?? "").toLowerCase() === "in force" && p.policyId && p.title,
  );
  const citations = assignCitations(inForce);
  return inForce.map((p) => mapPolicy(p, citations.get(p.policyId)!));
}

export const IEA_POLICY_CONNECTORS: Connector[] = [
  {
    id: "iea-policies",
    label: "IEA — Policies database",
    regulator_slug: REGULATOR_SLUG,
    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      if (ctx.dryRun) {
        return { source: "iea-policies", fetched: 0, errors: [], items: [] };
      }
      try {
        const all = await buildIeaInForceItems();
        // Daily cron passes a small lookback — only emit policies the IEA
        // modified within the window so the run stays light. The full backfill
        // bypasses this by calling buildIeaInForceItems() directly.
        const cutoff =
          ctx.now.getTime() - ctx.lookbackDays * 24 * 60 * 60 * 1000;
        const items = all.filter(
          (it) => new Date(it.last_changed_at).getTime() >= cutoff,
        );
        return {
          source: "iea-policies",
          fetched: items.length,
          errors: [],
          items,
        };
      } catch (e) {
        return {
          source: "iea-policies",
          fetched: 0,
          errors: [(e as Error).message],
          items: [],
        };
      }
    },
  },
];
