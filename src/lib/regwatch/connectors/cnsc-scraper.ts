import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  HierarchyNode,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * CNSC connector — Canadian Nuclear Safety Commission.
 *
 * Single-hop scrape of the public "Regulatory documents" index:
 *   https://www.cnsc-ccsn.gc.ca/eng/acts-and-regulations/regulatory-documents/
 *
 * The index is a static, server-rendered page with a stable structure:
 *
 *   <h2 id="R1">1.0 Regulated facilities and activities</h2>   ← Category
 *   <h3 id="R2">1.1 Reactor facilities</h3>                     ← Series
 *   <table class="table table-hover"> … rows …                  ← Documents
 *       <td><p><a href="…/published/html/regdoc2-1-1/">
 *             <strong>REGDOC-2.1.1, Management System</strong></a></p>
 *           <p><a href="…/history/regdoc2-1-1/">Document history…</a></p></td>
 *       <td>Published May 2019</td>
 *
 * We parse it into Category → Series → Document and emit:
 *   - run()           → one NormalisedItem per published REGDOC (guidance).
 *   - buildHierarchy() → the 3-level tree (ca.cnsc → category → series →
 *                        document leaf) for the eCFR-style browse view.
 *
 * Citation = the REGDOC number (e.g. "REGDOC-2.1.1"); the body text is left
 * null and filled by the enrichment pass from the published HTML source_url.
 */

const INDEX_URL =
  "https://www.cnsc-ccsn.gc.ca/eng/acts-and-regulations/regulatory-documents/";
const BASE = "https://www.cnsc-ccsn.gc.ca";
const FETCH_TIMEOUT_MS = 25_000;
const USER_AGENT =
  "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";

interface ParsedDocument {
  citation: string; // "REGDOC-2.1.1"
  title: string; // "Management System"
  sourceUrl: string; // absolute published/html URL
  status: "in-force" | "proposed";
}

interface ParsedSeries {
  /** e.g. "2.1" */
  number: string;
  /** e.g. "Management system" */
  name: string;
  documents: ParsedDocument[];
}

interface ParsedCategory {
  /** e.g. "2.0" */
  number: string;
  /** e.g. "Safety and control areas" */
  name: string;
  series: ParsedSeries[];
}

function buildConnector(): Connector {
  return {
    id: "cnsc-regulatory-documents",
    label: "CNSC Regulatory Documents (REGDOC catalogue)",
    regulator_slug: "ca-cnsc",

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: "cnsc-regulatory-documents",
        fetched: 0,
        errors: [],
        items: [],
      };

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${INDEX_URL}`);
        return result;
      }

      let categories: ParsedCategory[];
      try {
        const html = await fetchText(INDEX_URL);
        categories = parseIndex(html);
      } catch (e) {
        result.errors.push(`index fetch/parse: ${(e as Error).message}`);
        return result;
      }

      if (categories.length === 0) {
        result.errors.push(
          "Zero categories parsed from the CNSC index — HTML structure may have shifted. Inspect the regulatory-documents page and update the heading/table regexes.",
        );
        return result;
      }

      const nowIso = ctx.now.toISOString();
      for (const cat of categories) {
        for (const series of cat.series) {
          for (const doc of series.documents) {
            result.items.push({
              regulator_slug: "ca-cnsc",
              citation: doc.citation,
              slug: citationSlug(doc.citation),
              title: doc.title,
              instrument_type: "guidance",
              status: doc.status,
              effective_date: null,
              proposed_date: null,
              consultation_closes_at: null,
              published_at: nowIso,
              last_changed_at: nowIso,
              source_url: doc.sourceUrl,
              summary: null,
              body_text: null,
              body_html: null,
              jurisdiction_code: "CA",
              topics: deriveTopics(series.number, series.name, doc.title),
            });
          }
        }
      }
      result.fetched = result.items.length;
      return result;
    },

    async buildHierarchy(ctx: ConnectorRunContext): Promise<HierarchyNode[]> {
      if (ctx.dryRun) return [];
      const root: HierarchyNode = {
        path: "ca.cnsc",
        level: 1,
        level_label: "Publisher",
        identifier: "CNSC",
        title: "Canadian Nuclear Safety Commission",
        citation: null,
        source_url: INDEX_URL,
        children: [],
      };
      try {
        const html = await fetchText(INDEX_URL);
        const categories = parseIndex(html);
        for (const cat of categories) {
          const catPath = `ca.cnsc.${numSlug(cat.number)}`;
          const catNode: HierarchyNode = {
            path: catPath,
            level: 2,
            level_label: "Category",
            identifier: `${cat.number} ${cat.name}`,
            title: null,
            citation: null,
            source_url: `${INDEX_URL}#${categoryAnchor(cat.number)}`,
            children: cat.series.map((series) => {
              const seriesPath = `${catPath}.${numSlug(series.number)}`;
              return {
                path: seriesPath,
                level: 3,
                level_label: "Series",
                identifier: `${series.number} ${series.name}`,
                title: null,
                citation: null,
                source_url: INDEX_URL,
                children: series.documents.map((doc) => ({
                  path: `${seriesPath}.${citationSlug(doc.citation)}`,
                  level: 4,
                  level_label: "Document",
                  identifier: doc.citation,
                  title: doc.title,
                  citation: doc.citation,
                  source_url: doc.sourceUrl,
                  children: [],
                })),
              };
            }),
          };
          root.children.push(catNode);
        }
      } catch (e) {
        console.error("[cnsc-hierarchy]", (e as Error).message);
      }
      return [root];
    },
  };
}

// ---------------------------------------------------------------------------
// Index parsing
// ---------------------------------------------------------------------------

/** Matches a category (h2) or series (h3) heading carrying an R-anchor id. */
const HEADING_RE =
  /<h([23])[^>]*\bid="(R\d+)"[^>]*>\s*(\d+\.\d+)\s+([^<]+?)\s*<\/h[23]>/gi;

/**
 * Matches one published REGDOC anchor: the published/html link wrapping a
 * <strong>REGDOC-x.y.z, Title</strong>. The history link in the same row
 * does NOT wrap a <strong>, so it's naturally excluded.
 */
const DOC_RE =
  /<a[^>]+href="([^"]*\/published\/html\/[^"]+)"[^>]*>\s*<strong>\s*(REGDOC-[\d.]+[A-Za-z]?)\s*,?\s*([^<]*?)\s*<\/strong>/gi;

function parseIndex(html: string): ParsedCategory[] {
  // 1. Collect heading positions in document order.
  interface Heading {
    level: 2 | 3;
    number: string;
    name: string;
    start: number; // index just after the heading tag
  }
  const headings: Heading[] = [];
  HEADING_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEADING_RE.exec(html)) !== null) {
    headings.push({
      level: m[1] === "2" ? 2 : 3,
      number: m[3],
      name: decodeEntities(m[4]).trim(),
      start: m.index + m[0].length,
    });
  }
  if (headings.length === 0) return [];

  // 2. Walk headings, attaching series to their parent category and parsing
  //    the document table that sits between a series heading and the next
  //    heading of any level.
  const categories: ParsedCategory[] = [];
  let currentCategory: ParsedCategory | null = null;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const sliceEnd = i + 1 < headings.length ? headings[i + 1].start : html.length;

    if (h.level === 2) {
      currentCategory = { number: h.number, name: h.name, series: [] };
      categories.push(currentCategory);
      continue;
    }

    // h.level === 3 — a series. Parse documents in its slice.
    const slice = html.slice(h.start, sliceEnd);
    const documents = parseDocuments(slice);
    const series: ParsedSeries = {
      number: h.number,
      name: h.name,
      documents,
    };
    if (!currentCategory) {
      // Defensive: a series before any category (shouldn't happen) gets a
      // synthetic parent so it still surfaces.
      currentCategory = { number: "0.0", name: "Uncategorised", series: [] };
      categories.push(currentCategory);
    }
    currentCategory.series.push(series);
  }

  // Drop empty categories/series so the tree stays clean.
  return categories
    .map((c) => ({ ...c, series: c.series.filter((s) => s.documents.length > 0) }))
    .filter((c) => c.series.length > 0);
}

function parseDocuments(sliceHtml: string): ParsedDocument[] {
  const docs: ParsedDocument[] = [];
  const seen = new Set<string>();
  DOC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DOC_RE.exec(sliceHtml)) !== null) {
    const href = absolutise(m[1]);
    if (!href) continue;
    const citation = m[2].trim();
    if (seen.has(citation)) continue;
    seen.add(citation);
    const title = decodeEntities(m[3]).replace(/\s+/g, " ").trim() || citation;
    // Status lives in the sibling <td> after the title cell; a "Published"
    // date means in-force, anything else (e.g. "Under development") we treat
    // as proposed. We look just past this match for the next <td>.
    const after = sliceHtml.slice(m.index, m.index + 1200);
    const status: "in-force" | "proposed" =
      /Under\s+development|In\s+development|Withdrawn/i.test(after) &&
      !/Published/i.test(after)
        ? "proposed"
        : "in-force";
    docs.push({ citation, title, sourceUrl: href, status });
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Topic derivation
// ---------------------------------------------------------------------------

function deriveTopics(
  seriesNumber: string,
  seriesName: string,
  docTitle: string,
): string[] {
  const base = new Set<string>(["nuclear"]);
  const hay = `${seriesName} ${docTitle}`.toLowerCase();

  if (/radiation|dosimetry/.test(hay)) base.add("radiation");
  if (/management system|safety analysis|fitness for service|physical design|operating performance|human performance/.test(hay))
    base.add("process-safety");
  if (/health and safety|conventional health/.test(hay)) base.add("worker-safety");
  if (/environment|waste|emergency/.test(hay)) base.add("emissions");
  if (/licen[cs]|certification|facilities|mines|reactor/.test(hay))
    base.add("permitting");
  if (/reporting/.test(hay)) base.add("reporting");

  // Series-number fallbacks for sparse titles.
  if (seriesNumber.startsWith("1.")) base.add("permitting");
  if (seriesNumber === "2.7" || seriesNumber === "2.8") base.add("radiation");

  return Array.from(base);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "en-CA,en;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function absolutise(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${BASE}${href}`;
  return null;
}

/** "2.1" → "2_1" — a path-safe segment for ltree coordinates. */
function numSlug(number: string): string {
  return number.replace(/[^0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Best-effort mapping of a category number back to its page anchor. */
function categoryAnchor(number: string): string {
  if (number === "1.0") return "R1";
  if (number === "2.0") return "R8";
  if (number === "3.0") return "R23";
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export const CNSC_CONNECTORS: Connector[] = [buildConnector()];
