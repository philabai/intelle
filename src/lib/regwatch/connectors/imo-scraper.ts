import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * IMO connector — MediaCentre press briefings.
 *
 * The original implementation scraped the resolution index pages at
 * /en/KnowledgeCentre/IndexofIMOResolutions/Pages/MEPC.aspx and MSC.aspx,
 * but those pages are TOCs that link out to per-decade subpages — and the
 * decade subpages currently return HTTP 500 from IMO's own server. We only
 * caught example citations mentioned inline in the TOC text (1-2 per page).
 *
 * The MediaCentre press briefings page lists current IMO announcements —
 * MEPC/MSC committee outcomes, treaty entries into force, codes adopted,
 * etc. — with stable URLs. For compliance teams this is actually MORE
 * useful than the resolution catalog: press releases announce decisions
 * before resolutions are formally numbered.
 *
 * Each briefing becomes one corpus item. The URL slug is the canonical
 * citation; the title is the anchor text. Date extraction from the
 * surrounding HTML is brittle so we default published_at to the crawl
 * time — items are clearly "recent" by virtue of appearing on the index.
 */

const INDEX_URL =
  "https://www.imo.org/en/MediaCentre/PressBriefings/Pages/Default.aspx";

// Matches anchors pointing at individual press briefings.
// Example: <a href="/en/MediaCentre/PressBriefings/pages/IMO-adopts-MASS-Code.aspx">IMO adopts first global Code for autonomous ships</a>
const BRIEFING_ANCHOR_REGEX =
  /<a[^>]+href="(\/en\/MediaCentre\/PressBriefings\/pages\/[^"]+\.aspx)"[^>]*>([^<]{8,300})<\/a>/gi;

// Anything that looks like "Read more" / "Read full briefing" — used to skip
// duplicate anchors that wrap the call-to-action rather than the headline.
const SKIP_TITLE_REGEX = /^(read more|read full|view|continue|details?)$/i;

export const IMO_PRESS_BRIEFING_CONNECTOR: Connector = {
  id: "imo-press-briefings",
  label: "IMO MediaCentre press briefings",
  regulator_slug: "int-imo",

  async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
    const result: ConnectorResult = {
      source: "imo-press-briefings",
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
          "Accept-Language": "en",
          "User-Agent":
            "intelle-regwatch/0.1 (https://intelle.io/regwatch)",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        result.errors.push(`HTTP ${res.status} from IMO MediaCentre`);
        return result;
      }
      html = await res.text();
    } catch (e) {
      result.errors.push(`network: ${(e as Error).message}`);
      return result;
    }

    // Extract every (url, title) pair, dedupe by URL — the page often has the
    // same briefing linked twice (image link + text link + "Read more").
    const seen = new Map<string, string>(); // url -> best title
    let m: RegExpExecArray | null;
    while ((m = BRIEFING_ANCHOR_REGEX.exec(html)) !== null) {
      const href = m[1];
      const title = decodeHtmlEntities(m[2]).trim();
      // Skip Read More/View anchors — keep the headline anchor for the same URL.
      if (SKIP_TITLE_REGEX.test(title)) continue;
      if (title.length < 12) continue; // headlines are always longer
      const existing = seen.get(href);
      if (!existing || existing.length < title.length) {
        seen.set(href, title);
      }
      if (seen.size >= 30) break;
    }

    result.fetched = seen.size;
    const nowIso = ctx.now.toISOString();

    for (const [href, title] of seen) {
      const fullUrl = `https://www.imo.org${href}`;
      // URL slug → citation. Drop the leading path + .aspx suffix.
      const slugFromUrl = href
        .replace(/^.*\/pages\//i, "")
        .replace(/\.aspx$/i, "")
        .replace(/^-+|-+$/g, "");
      const citation = `IMO press: ${slugFromUrl}`;
      const item: NormalisedItem = {
        regulator_slug: "int-imo",
        citation,
        slug: citationSlug(citation),
        title,
        instrument_type: "notice",
        status: "in-force",
        effective_date: null,
        proposed_date: null,
        consultation_closes_at: null,
        published_at: nowIso,
        last_changed_at: nowIso,
        source_url: fullUrl,
        // Brief summary placeholder — enrichment can fetch the briefing page
        // body later. For Phase 1.7 the title alone is enough signal.
        summary: null,
        body_text: null,
        body_html: null,
        jurisdiction_code: "INT",
        // Generic IMO topics — enrichment refines per-item from title content.
        topics: ["bunker-spec", "emissions", "process-safety"],
      };
      result.items.push(item);
    }
    return result;
  },
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Single connector — replaces the previous MEPC + MSC scrapers which depended
// on unreliable index pages.
export const IMO_CONNECTORS: Connector[] = [IMO_PRESS_BRIEFING_CONNECTOR];

// Backward-compatible export so the registry doesn't need to change.
export const IMO_SCRAPER = IMO_PRESS_BRIEFING_CONNECTOR;
