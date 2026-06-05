import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  InstrumentType,
  ItemStatus,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * Generic "press page scraper" — factor common to ESMA, IEA, NSTA, ADNOC, and
 * the IMO MediaCentre scraper. Each regulator publishes an HTML index page
 * with anchors pointing at individual articles. The connector:
 *   1. fetches the index
 *   2. regex-matches anchors whose href starts with an article-path prefix
 *   3. dedupes by URL (same article often appears as image-link + text-link
 *      + "Read more" repeats)
 *   4. emits one NormalisedItem per unique URL
 *
 * Date extraction from the surrounding HTML is brittle across publishers, so
 * we default published_at to the crawl time — items are "recent" by virtue
 * of appearing on the index page. Enrichment can refine titles/topics later.
 */

export interface PressPageConfig {
  /** Stable connector ID. */
  id: string;
  /** Human label for the cron response per-connector report. */
  label: string;
  /** Regulator slug the items attribute to (must exist in regwatch.regulators). */
  regulator_slug: string;
  /** ISO jurisdiction code (US / EU / UK / AE / INT / etc.). */
  jurisdiction_code: string;
  /** URL of the index page to scrape. */
  index_url: string;
  /** Origin used to absolutize relative hrefs (e.g. "https://www.esma.europa.eu"). */
  origin: string;
  /**
   * Path prefix that identifies an article anchor. Must match the start of
   * the href attribute on individual-article links and exclude navigation/
   * search/filter links. Example: "/press-news/esma-news/".
   */
  article_path_prefix: string;
  /** Citation prefix prepended to the URL slug — e.g. "ESMA news". */
  citation_prefix: string;
  /** Topic tags assigned to every scraped item before enrichment. */
  default_topics: string[];
  /** Defaults to "notice"; only override when the source is clearly different. */
  instrument_type?: InstrumentType;
  /** Defaults to "in-force". */
  status?: ItemStatus;
  /** Hard cap on items scraped per run (newest are kept). Default 30. */
  max_items?: number;
}

const DEFAULT_MAX_ITEMS = 30;

// Anchor labels that are NOT real headlines — they wrap call-to-action links
// for the same underlying article. Skip them so headline anchor wins dedup.
const SKIP_TITLE_REGEX =
  /^(read more|read full|read article|view|continue|details?|more|next|previous)$/i;

export function makePressPageConnector(cfg: PressPageConfig): Connector {
  // Build a per-connector regex that matches anchors whose href starts with
  // the article path prefix. Escaped because some prefixes contain regex
  // metacharacters.
  const escapedPrefix = cfg.article_path_prefix.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  // Match <a href="..."> ... </a> where href starts with the prefix.
  // [\s\S] (not .) so the title can include newlines inside the anchor.
  const anchorRegex = new RegExp(
    `<a[^>]+href="(${escapedPrefix}[^"#?]+)"[^>]*>([\\s\\S]{8,400}?)<\\/a>`,
    "gi",
  );
  const maxItems = cfg.max_items ?? DEFAULT_MAX_ITEMS;

  return {
    id: cfg.id,
    label: cfg.label,
    regulator_slug: cfg.regulator_slug,

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: cfg.id,
        fetched: 0,
        errors: [],
        items: [],
      };

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${cfg.index_url}`);
        return result;
      }

      let html: string;
      try {
        const res = await fetch(cfg.index_url, {
          headers: {
            Accept: "text/html",
            "Accept-Language": "en",
            "User-Agent":
              "intelle-regwatch/0.1 (https://intelle.io/regwatch)",
          },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          result.errors.push(`HTTP ${res.status} from ${cfg.id}`);
          return result;
        }
        html = await res.text();
      } catch (e) {
        result.errors.push(`network: ${(e as Error).message}`);
        return result;
      }

      // (url, title) extraction with dedup — keep the longest title per URL
      // so headline anchors win over short "Read more" wrappers.
      const seen = new Map<string, string>();
      let m: RegExpExecArray | null;
      while ((m = anchorRegex.exec(html)) !== null) {
        const href = m[1];
        const title = decodeHtmlEntities(stripTags(m[2])).trim();
        if (!title || title.length < 12) continue;
        if (SKIP_TITLE_REGEX.test(title)) continue;
        const existing = seen.get(href);
        if (!existing || title.length > existing.length) {
          seen.set(href, title);
        }
        if (seen.size >= maxItems * 2) break; // pull extra to survive dedup
      }

      // Slice to max_items (insertion order ≈ document order ≈ recency).
      const entries = Array.from(seen.entries()).slice(0, maxItems);
      result.fetched = entries.length;
      const nowIso = ctx.now.toISOString();

      for (const [href, title] of entries) {
        const fullUrl = href.startsWith("http")
          ? href
          : `${cfg.origin}${href.startsWith("/") ? "" : "/"}${href}`;
        const urlSlug = href
          .split(/[/?#]/)
          .filter(Boolean)
          .pop()!
          .replace(/\.(aspx|html?|php)$/i, "")
          .slice(0, 80);
        const citation = `${cfg.citation_prefix}: ${urlSlug}`;
        const item: NormalisedItem = {
          regulator_slug: cfg.regulator_slug,
          citation,
          slug: citationSlug(citation),
          title,
          instrument_type: cfg.instrument_type ?? "notice",
          status: cfg.status ?? "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: nowIso,
          last_changed_at: nowIso,
          source_url: fullUrl,
          summary: null,
          body_text: null,
          body_html: null,
          jurisdiction_code: cfg.jurisdiction_code,
          topics: cfg.default_topics,
        };
        result.items.push(item);
      }
      return result;
    },
  };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}
