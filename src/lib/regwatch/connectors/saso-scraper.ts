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
 * Scrapes the public Laws & Regulations index pages (technical
 * regulations, rules, policies, certifications). Each linked item
 * becomes one corpus row; the connector sniffs Content-Type to set
 * source_mime so the dual-view reader (PR-D) knows whether to render
 * via react-pdf or sandboxed iframe. SASO regulation links are a mix
 * of inline HTML pages and direct-to-PDF downloads.
 *
 * SASO site characteristics:
 *  - ASPX server-rendered (not JS-rendered, not Cloudflare-walled)
 *  - English page lives at /en/ — Arabic versions deferred (separate
 *    URL tree, separate connector when we expand i18n)
 *  - Standard SharePoint navigation; anchors have predictable hrefs
 *
 * buildHierarchy: each category index page becomes a level-1 node;
 * each regulation under it becomes a level-2 leaf. Mirrors the way
 * SASO itself organises the Laws & Regulations menu.
 */

interface SasoCategory {
  /** Category identifier used as the level-1 path segment. */
  key: string;
  /** Human-readable label rendered in the browse tree. */
  label: string;
  /** Index URL for the category page. */
  indexUrl: string;
}

const SASO_CATEGORIES: SasoCategory[] = [
  {
    key: "technical_regulations",
    label: "Technical regulations",
    indexUrl:
      "https://www.saso.gov.sa/en/Laws-And-Regulations/Technical_regulations/Pages/default.aspx",
  },
  {
    key: "rules",
    label: "Rules",
    indexUrl:
      "https://www.saso.gov.sa/en/Laws-And-Regulations/Rules/Pages/default.aspx",
  },
  {
    key: "policies",
    label: "Policies",
    indexUrl:
      "https://www.saso.gov.sa/en/Laws-And-Regulations/Policies/Pages/default.aspx",
  },
  {
    key: "certifications",
    label: "Certifications",
    indexUrl:
      "https://www.saso.gov.sa/en/Laws-And-Regulations/Certifications/Pages/default.aspx",
  },
];

// Matches anchors deep-linking to PDFs (final regulation docs).
const PDF_ANCHOR_REGEX =
  /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
// Matches anchors pointing at internal SASO regulation HTML pages.
const HTML_ANCHOR_REGEX =
  /<a[^>]+href="(\/en\/Laws-And-Regulations\/[^"]+\.aspx)"[^>]*>([\s\S]*?)<\/a>/gi;

const SKIP_TITLE_REGEX = /^(read more|more|view|details?|click here|>>)$/i;

interface ScrapedLink {
  url: string;
  title: string;
  mime: "application/pdf" | "text/html";
  category: SasoCategory;
}

function buildConnector(): Connector {
  return {
    id: "saso-laws-and-regulations",
    label: "SASO Laws & Regulations (technical / rules / policies / certifications)",
    regulator_slug: "sa-saso",

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: "saso-laws-and-regulations",
        fetched: 0,
        errors: [],
        items: [],
      };

      if (ctx.dryRun) {
        result.errors.push(
          `dryRun — would fetch ${SASO_CATEGORIES.length} category pages`,
        );
        return result;
      }

      const allLinks: ScrapedLink[] = [];
      for (const category of SASO_CATEGORIES) {
        try {
          const links = await scrapeCategory(category);
          allLinks.push(...links);
        } catch (e) {
          result.errors.push(`${category.key}: ${(e as Error).message}`);
        }
      }

      // Dedupe by URL (one row even if a SASO regulation surfaces under
      // multiple category indexes).
      const byUrl = new Map<string, ScrapedLink>();
      for (const l of allLinks) {
        const existing = byUrl.get(l.url);
        if (!existing || existing.title.length < l.title.length) {
          byUrl.set(l.url, l);
        }
      }

      const nowIso = ctx.now.toISOString();
      for (const link of byUrl.values()) {
        const citation = deriveCitation(link.url, link.title);
        const item: NormalisedItem = {
          regulator_slug: "sa-saso",
          citation,
          slug: citationSlug(citation),
          title: link.title,
          instrument_type: "standard",
          status: "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: nowIso,
          last_changed_at: nowIso,
          source_url: link.url,
          summary: null,
          body_text: null,
          body_html: null,
          jurisdiction_code: "SA",
          topics: ["standards", "gulf", "gcc-alignment"],
        };
        result.items.push(item);
      }
      result.fetched = result.items.length;
      return result;
    },

    async buildHierarchy(ctx: ConnectorRunContext): Promise<HierarchyNode[]> {
      if (ctx.dryRun) return [];

      // Top-level synthetic root scoped to SASO so the browse tree
      // groups every category under one collapsible heading.
      const root: HierarchyNode = {
        path: "sa.saso",
        level: 1,
        level_label: "Publisher",
        identifier: "SASO",
        title: "Saudi Standards, Metrology and Quality Organization",
        citation: null,
        source_url: "https://www.saso.gov.sa/en/Laws-And-Regulations/Pages/default.aspx",
        children: [],
      };

      for (const category of SASO_CATEGORIES) {
        const categoryNode: HierarchyNode = {
          path: `sa.saso.${category.key}`,
          level: 2,
          level_label: "Category",
          identifier: category.label,
          title: null,
          citation: null,
          source_url: category.indexUrl,
          children: [],
        };
        try {
          const links = await scrapeCategory(category);
          for (const link of links) {
            const citation = deriveCitation(link.url, link.title);
            const leafSlug = citationSlug(citation);
            categoryNode.children.push({
              path: `sa.saso.${category.key}.${leafSlug}`,
              level: 3,
              level_label: "Document",
              identifier: citation,
              title: link.title,
              citation,
              source_url: link.url,
              children: [],
            });
          }
        } catch (e) {
          // Continue with other categories on per-page failure — the
          // hierarchy run already tolerates incomplete trees.
          console.error(`[saso-hierarchy] ${category.key}: ${(e as Error).message}`);
        }
        root.children.push(categoryNode);
      }

      return [root];
    },
  };
}

async function scrapeCategory(category: SasoCategory): Promise<ScrapedLink[]> {
  const res = await fetch(category.indexUrl, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en",
      "User-Agent":
        "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const html = await res.text();
  const links: ScrapedLink[] = [];

  // Pass 1: direct-to-PDF anchors.
  let m: RegExpExecArray | null;
  while ((m = PDF_ANCHOR_REGEX.exec(html)) !== null) {
    const url = absolutise(m[1]);
    const title = cleanTitle(m[2]);
    if (!url || !title) continue;
    links.push({ url, title, mime: "application/pdf", category });
    if (links.length >= 200) break;
  }
  PDF_ANCHOR_REGEX.lastIndex = 0;

  // Pass 2: internal SASO regulation HTML pages (skip the default.aspx of
  // sister categories that surface on every page).
  while ((m = HTML_ANCHOR_REGEX.exec(html)) !== null) {
    const url = absolutise(m[1]);
    if (!url) continue;
    if (/\/Pages\/default\.aspx/i.test(url)) continue; // category index links
    const title = cleanTitle(m[2]);
    if (!title) continue;
    links.push({ url, title, mime: "text/html", category });
    if (links.length >= 400) break;
  }
  HTML_ANCHOR_REGEX.lastIndex = 0;

  return links;
}

function absolutise(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `https://www.saso.gov.sa${href}`;
  return null;
}

function cleanTitle(rawHtml: string): string | null {
  const stripped = rawHtml.replace(/<[^>]+>/g, "");
  const decoded = stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!decoded) return null;
  if (SKIP_TITLE_REGEX.test(decoded)) return null;
  if (decoded.length < 8 || decoded.length > 300) return null;
  return decoded;
}

/**
 * Citation derivation:
 *   1. If the URL contains a SASO standard / regulation number, use it.
 *   2. Else use the filename (without extension).
 *   3. Else use the title (clipped + slug-ish).
 */
function deriveCitation(url: string, title: string): string {
  // Pattern e.g. "SASO 2870" or "SASO-CIVD-2021-XX" sometimes appears in
  // the URL slug; capture it if present.
  const numberMatch = url.match(/(SASO[\s_-]?\d{2,5}(?:[\s_-]\d{1,3})?)/i);
  if (numberMatch) {
    return numberMatch[1].replace(/[_]/g, " ").toUpperCase();
  }
  const filename = url.split("/").pop() ?? "";
  const baseName = filename.replace(/\.(pdf|aspx|html?)$/i, "");
  if (baseName && baseName.length <= 80) {
    return `SASO ${baseName.replace(/[-_]+/g, " ")}`;
  }
  return `SASO · ${title.slice(0, 60)}`;
}

export const SASO_CONNECTORS: Connector[] = [buildConnector()];
