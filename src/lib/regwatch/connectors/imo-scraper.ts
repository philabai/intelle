import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * IMO MEPC + MSC Resolutions screen scraper.
 *
 * The IMO does not publish a REST API for resolutions. This connector hits the
 * public KnowledgeCentre index page and parses MEPC/MSC resolution numbers
 * with regex — proof of the screen-scraping pattern requested for sources
 * without API access. ADNOC / MEWA / QPSA / IEA / IRENA will use the same
 * shape (fetch + parse HTML + normalise) once their index URLs are mapped.
 *
 * The HTML structure is stable enough for a regex parse; Phase 1.x can swap
 * in cheerio for DOM traversal if pagination or AJAX-rendered fields appear.
 */
const INDEX_URL =
  "https://www.imo.org/en/KnowledgeCentre/IndexofIMOResolutions/Pages/MEPC.aspx";

// Match common MEPC resolution patterns: "MEPC.123(45)" or "MEPC.345(76) — title"
const RESOLUTION_REGEX = /MEPC\.(\d{1,4})\((\d{1,3})\)/gi;
// Capture surrounding link text — IMO uses <a href="..."> for each resolution row.
const LINK_REGEX =
  /<a[^>]+href="([^"]+\.pdf)"[^>]*>[\s\S]*?(MEPC\.\d{1,4}\(\d{1,3}\))[\s\S]*?<\/a>/gi;

export const IMO_SCRAPER: Connector = {
  id: "imo-mepc-scraper",
  label: "IMO MEPC Resolutions (HTML scrape)",
  regulator_slug: "int-imo",

  async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
    const result: ConnectorResult = {
      source: "imo-mepc-scraper",
      fetched: 0,
      errors: [],
      items: [],
    };

    if (ctx.dryRun) {
      result.errors.push(`dryRun — would fetch ${INDEX_URL}`);
      return result;
    }

    let html: string;
    try {
      const res = await fetch(INDEX_URL, {
        headers: {
          Accept: "text/html",
          "User-Agent": "intelle-regwatch/0.1 (https://intelle.io/regwatch)",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        result.errors.push(`HTTP ${res.status} from IMO`);
        return result;
      }
      html = await res.text();
    } catch (e) {
      result.errors.push(`network: ${(e as Error).message}`);
      return result;
    }

    // Extract resolutions via the link-based regex. The index is large so we
    // dedupe by citation and cap at 50 most recent matches.
    const seen = new Set<string>();
    const matches: { citation: string; href: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = LINK_REGEX.exec(html)) !== null) {
      const href = m[1];
      const citation = m[2];
      if (seen.has(citation)) continue;
      seen.add(citation);
      matches.push({ citation, href });
      if (matches.length >= 50) break;
    }

    // Fallback — if the structured link regex misses (page format change),
    // fall back to the bare resolution pattern with the index URL as source.
    if (matches.length === 0) {
      const fallback: string[] = [];
      while ((m = RESOLUTION_REGEX.exec(html)) !== null) {
        const citation = `MEPC.${m[1]}(${m[2]})`;
        if (!seen.has(citation)) {
          seen.add(citation);
          fallback.push(citation);
        }
        if (fallback.length >= 50) break;
      }
      for (const citation of fallback) {
        matches.push({ citation, href: INDEX_URL });
      }
    }

    result.fetched = matches.length;
    const nowIso = ctx.now.toISOString();

    for (const { citation, href } of matches) {
      const fullUrl = href.startsWith("http")
        ? href
        : `https://www.imo.org${href.startsWith("/") ? "" : "/"}${href}`;
      const item: NormalisedItem = {
        regulator_slug: "int-imo",
        citation,
        slug: citationSlug(citation),
        title: `${citation} (IMO MEPC Resolution)`,
        instrument_type: "standard",
        status: "in-force",
        effective_date: null,
        proposed_date: null,
        consultation_closes_at: null,
        published_at: nowIso,
        last_changed_at: nowIso,
        source_url: fullUrl,
        // Body to be filled by enrichment fetch of the PDF in a Phase 1.x sub-slice.
        summary: null,
        body_text: null,
        body_html: null,
        jurisdiction_code: "INT",
        topics: ["bunker-spec", "emissions"],
      };
      result.items.push(item);
    }
    return result;
  },
};
