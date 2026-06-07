import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  HierarchyNode,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * SASO connector — Saudi Standards, Metrology and Quality Organization.
 *
 * Multi-hop scrape:
 *   1. Fetch the public Technical Regulations index pages (one per
 *      category: Textile / Construction / Mechanical / Electrical /
 *      Chemistry / Services).
 *   2. Parse the regulation cards on each index page → (title,
 *      detailUrl) pairs.
 *   3. For each card, fetch the detail page (rate-limited, capped to
 *      ~50 detail fetches per run for cron-budget safety).
 *   4. On the detail page, find the actual PDF download link. The
 *      page exposes both Arabic and English PDFs sometimes — Arabic
 *      is the canonical one for compliance evidence, so we prefer it.
 *   5. Emit one NormalisedItem per card with source_url pointing at
 *      the resolved PDF URL (not the index page), and source_mime
 *      = "application/pdf". The Original tab caches this PDF; the
 *      English tab translates from it.
 *
 * Citation derivation matches the 20260709 seed naming convention
 * (e.g. "Technical Regulation for Tanks" → "SASO TR · Tanks"), so
 * scraper-emitted rows UPDATE existing seed rows on (regulator_id,
 * citation) rather than creating duplicates. After a successful
 * scraper run, the seeded source_url=index page gets overwritten
 * with the real PDF URL.
 *
 * Failure modes the user should expect:
 *   - SASO returning a Cloudflare block (similar to MEWA/QPSA in the
 *     connector backlog) — fall back to seed data.
 *   - HTML structure changes — regexes need iteration. Run via admin
 *     /admin/connectors and inspect the per-connector telemetry.
 */

interface SasoCategory {
  key: string;
  label: string;
  indexUrl: string;
}

const SASO_CATEGORIES: SasoCategory[] = [
  // SASO publishes one index page per category. The page on the user-
  // shared screenshot is the "All" view; the per-category pages have
  // the same card layout with a category filter applied.
  {
    key: "all",
    label: "All",
    indexUrl:
      "https://www.saso.gov.sa/en/laws-and-regulations/technical_regulations/pages/default.aspx",
  },
];

const MAX_DETAIL_FETCHES = 50;
const FETCH_TIMEOUT_MS = 20_000;
const INTER_FETCH_DELAY_MS = 250;

const USER_AGENT =
  "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";

interface CardCandidate {
  title: string;
  detailUrl: string;
  category: SasoCategory;
}

interface DetailPageResult {
  pdfUrl: string | null;
  summary: string | null;
}

function buildConnector(): Connector {
  return {
    id: "saso-technical-regulations",
    label: "SASO Technical Regulations (multi-hop PDF resolver)",
    regulator_slug: "sa-saso",

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: "saso-technical-regulations",
        fetched: 0,
        errors: [],
        items: [],
      };

      if (ctx.dryRun) {
        result.errors.push(
          `dryRun — would fetch ${SASO_CATEGORIES.length} index pages + up to ${MAX_DETAIL_FETCHES} detail pages`,
        );
        return result;
      }

      // Step 1+2: discover cards across all categories.
      const candidates: CardCandidate[] = [];
      for (const category of SASO_CATEGORIES) {
        try {
          const cards = await scrapeIndex(category);
          candidates.push(...cards);
        } catch (e) {
          result.errors.push(`${category.key}: ${(e as Error).message}`);
        }
      }

      // Dedupe by detailUrl (the All-view shows the same card surfaced
      // under multiple filters).
      const byUrl = new Map<string, CardCandidate>();
      for (const c of candidates) {
        if (!byUrl.has(c.detailUrl)) byUrl.set(c.detailUrl, c);
      }
      const unique = Array.from(byUrl.values());

      if (unique.length === 0) {
        result.errors.push(
          "Zero cards extracted from the SASO index — HTML structure may have shifted. Inspect saso.gov.sa and update CARD_PATTERNS.",
        );
        return result;
      }

      // Step 3+4: resolve each card's PDF URL via the detail page.
      const limited = unique.slice(0, MAX_DETAIL_FETCHES);
      if (unique.length > MAX_DETAIL_FETCHES) {
        result.errors.push(
          `Truncated to first ${MAX_DETAIL_FETCHES} detail fetches (${unique.length} cards seen). Re-run to pick up the rest.`,
        );
      }

      const nowIso = ctx.now.toISOString();
      for (const card of limited) {
        try {
          const detail = await scrapeDetail(card.detailUrl);
          // Polite throttle so SASO doesn't rate-limit us.
          await sleep(INTER_FETCH_DELAY_MS);

          const citation = deriveCanonicalCitation(card.title);
          const slug = citationSlug(citation);
          const sourceUrl = detail.pdfUrl ?? card.detailUrl;
          result.items.push({
            regulator_slug: "sa-saso",
            citation,
            slug,
            title: card.title,
            instrument_type: "standard",
            status: "in-force",
            effective_date: null,
            proposed_date: null,
            consultation_closes_at: null,
            published_at: nowIso,
            last_changed_at: nowIso,
            source_url: sourceUrl,
            summary: detail.summary,
            body_text: null,
            body_html: null,
            jurisdiction_code: "SA",
            topics: deriveTopics(card.title),
          });
        } catch (e) {
          result.errors.push(
            `card "${card.title}" (${card.detailUrl}): ${(e as Error).message}`,
          );
        }
      }
      result.fetched = result.items.length;
      return result;
    },

    async buildHierarchy(ctx: ConnectorRunContext): Promise<HierarchyNode[]> {
      if (ctx.dryRun) return [];
      const root: HierarchyNode = {
        path: "sa.saso",
        level: 1,
        level_label: "Publisher",
        identifier: "SASO",
        title: "Saudi Standards, Metrology and Quality Organization",
        citation: null,
        source_url:
          "https://www.saso.gov.sa/en/laws-and-regulations/technical_regulations/pages/default.aspx",
        children: [],
      };
      try {
        const cards = (await scrapeIndex(SASO_CATEGORIES[0])).slice(
          0,
          MAX_DETAIL_FETCHES,
        );
        const byCategory = groupByDerivedCategory(cards);
        for (const [category, items] of byCategory) {
          const categoryPath = `sa.saso.${category.toLowerCase().replace(/\s+/g, "_")}`;
          const node: HierarchyNode = {
            path: categoryPath,
            level: 2,
            level_label: "Category",
            identifier: category,
            title: null,
            citation: null,
            source_url:
              "https://www.saso.gov.sa/en/laws-and-regulations/technical_regulations/pages/default.aspx",
            children: items.map((c) => {
              const citation = deriveCanonicalCitation(c.title);
              return {
                path: `${categoryPath}.${citationSlug(citation)}`,
                level: 3,
                level_label: "Document",
                identifier: citation,
                title: c.title,
                citation,
                source_url: c.detailUrl,
                children: [],
              };
            }),
          };
          root.children.push(node);
        }
      } catch (e) {
        console.error(
          "[saso-hierarchy]",
          (e as Error).message,
        );
      }
      return [root];
    },
  };
}

// ---------------------------------------------------------------------------
// Step 1+2 — index page parsing
// ---------------------------------------------------------------------------

// Multiple patterns because SASO has switched markup styles a few
// times (older SharePoint pages vs. the newer Vue-based listing).
// Run each pattern, dedupe by detailUrl.
const CARD_PATTERNS: RegExp[] = [
  // Pattern A: anchor with explicit detail href + Technical Regulation in text.
  /<a[^>]+href="([^"]*?\/laws-and-regulations\/[^"]+\.aspx)"[^>]*>[\s\S]*?(Technical[\s\S]{0,200}?Regulation[^<]{0,250}?)<\/a>/gi,
  // Pattern B: card title in <h2/h3> with sibling anchor.
  /<h[23][^>]*>\s*(Technical[\s\S]{0,200}?Regulation[^<]{0,250}?)\s*<\/h[23]>[\s\S]{0,600}?<a[^>]+href="([^"]+\.aspx)"/gi,
];

async function scrapeIndex(category: SasoCategory): Promise<CardCandidate[]> {
  const html = await fetchText(category.indexUrl);
  const cards: CardCandidate[] = [];

  // Pattern A — typical anchor-text form.
  {
    const re = CARD_PATTERNS[0];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      const title = cleanCardTitle(m[2]);
      if (!title) continue;
      const detailUrl = absolutise(href);
      if (!detailUrl) continue;
      cards.push({ title, detailUrl, category });
    }
  }

  // Pattern B — title-then-anchor form.
  {
    const re = CARD_PATTERNS[1];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const title = cleanCardTitle(m[1]);
      if (!title) continue;
      const detailUrl = absolutise(m[2]);
      if (!detailUrl) continue;
      cards.push({ title, detailUrl, category });
    }
  }
  return cards;
}

function cleanCardTitle(rawHtml: string): string | null {
  const stripped = rawHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  if (stripped.length < 12 || stripped.length > 250) return null;
  if (!/technical[\s_-]+regulation/i.test(stripped)) return null;
  return stripped;
}

// ---------------------------------------------------------------------------
// Step 3+4 — detail page parsing
// ---------------------------------------------------------------------------

// PDF anchor patterns ranked by preference: explicit Arabic > generic
// > English (the canonical SASO regulation text is the Arabic one).
const PDF_PATTERNS = [
  // Pattern A: any anchor that ends in .pdf within Documents/ — covers
  // the standard SASO layout where regulation PDFs live under
  // /Documents/Technical%20Regulations/...pdf
  /<a[^>]+href="([^"]*Documents\/[^"]+?\.pdf)"[^>]*>/gi,
  // Pattern B: any direct .pdf anchor anywhere on the page.
  /<a[^>]+href="([^"]+?\.pdf)"[^>]*>/gi,
];

const SUMMARY_PATTERN =
  /<(?:meta\s+name="description"\s+content|p[^>]*class="[^"]*description[^"]*")="?([^"<]{40,800})"?/i;

async function scrapeDetail(detailUrl: string): Promise<DetailPageResult> {
  const html = await fetchText(detailUrl);

  // Find every PDF link on the page; prefer the first one that looks
  // like a regulation document (Arabic-folder paths usually contain
  // /ar/ or no language segment, English usually /en/).
  const pdfCandidates: string[] = [];
  for (const re of PDF_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const abs = absolutise(m[1]);
      if (abs && !pdfCandidates.includes(abs)) pdfCandidates.push(abs);
    }
    if (pdfCandidates.length > 0) break;
  }

  // Arabic preferred — drop /en/ variants when an /ar/ variant exists.
  const arabicPdf =
    pdfCandidates.find((u) => /\/ar(?:-sa)?\//i.test(u)) ?? null;
  const anyPdf = pdfCandidates[0] ?? null;
  const pdfUrl = arabicPdf ?? anyPdf;

  // Crude summary extraction — meta description or first description-
  // class paragraph. Returns null if neither exists.
  let summary: string | null = null;
  const sm = html.match(SUMMARY_PATTERN);
  if (sm) {
    summary = sm[1].replace(/\s+/g, " ").trim().slice(0, 600);
  }

  return { pdfUrl, summary };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "en,ar;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

function absolutise(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `https://www.saso.gov.sa${href}`;
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Strip the "Technical Regulation for " prefix and any em-dash /
 * colon suffix, normalise whitespace, prefix with "SASO TR · " so
 * the citation matches the 20260709 seed.
 *
 *   "Technical Regulation for Tanks"               → "SASO TR · Tanks"
 *   "Technical Regulation for Building Materials — Part 1"
 *                                                  → "SASO TR · Building Materials Part 1"
 *   "Technical Regulation for Footwear and their Accessories"
 *                                                  → "SASO TR · Footwear and Accessories"
 */
function deriveCanonicalCitation(title: string): string {
  const stripped = title
    .replace(/^\s*Technical\s+Regulation\s+(?:for|of)\s+/i, "")
    .replace(/\s+—\s+/g, " ")
    .replace(/\s+-\s+Part/g, " Part")
    .replace(/\bTheir\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return `SASO TR · ${stripped}`;
}

/** Maps each title to one of SASO's six categories based on keywords. */
function deriveCategory(title: string): string {
  const t = title.toLowerCase();
  if (/textile|footwear|fabric|garment/.test(t)) return "Textile";
  if (
    /building|cement|steel|concrete|door|window|sanitary|tank|construction|roof/.test(
      t,
    )
  )
    return "Construction";
  if (/vehicle|motorcycle|tire|tyre|lift|escalator|equipment|lubricant/.test(t))
    return "Mechanical";
  if (
    /electrical|electric|battery|cable|lamp|appliance|voltage|air condition|conditioner/.test(
      t,
    )
  )
    return "Electrical";
  if (
    /cosmetic|detergent|paint|chemical|petroleum|fuel|ppe|protective/.test(t)
  )
    return "Chemistry";
  return "Services";
}

function deriveTopics(title: string): string[] {
  const base = ["standards", "gulf", "gcc-alignment"];
  const t = title.toLowerCase();
  if (/energy|efficien|fuel|petroleum|battery|lamp|air condition/.test(t))
    base.push("energy");
  if (/safety|protect|ppe|equipment/.test(t)) base.push("worker-safety");
  if (/cosmetic|paint|detergent|chemical|lubricant/.test(t))
    base.push("chemicals");
  if (/emission|fuel|petroleum/.test(t)) base.push("emissions");
  if (/building|cement|construct|door|window|tank|sanitary/.test(t))
    base.push("construction");
  return Array.from(new Set(base));
}

function groupByDerivedCategory(
  cards: CardCandidate[],
): Map<string, CardCandidate[]> {
  const out = new Map<string, CardCandidate[]>();
  for (const c of cards) {
    const cat = deriveCategory(c.title);
    if (!out.has(cat)) out.set(cat, []);
    out.get(cat)!.push(c);
  }
  return out;
}

export const SASO_CONNECTORS: Connector[] = [buildConnector()];
