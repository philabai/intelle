import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * IMO Resolutions screen scraper — Phase 1.7 fix.
 *
 * The IMO doesn't publish a REST API for resolutions. This connector hits
 * the public KnowledgeCentre index pages for MEPC (environment) and MSC
 * (maritime safety) and parses resolution citations with regex. The static
 * HTML is sparse on a single page; we fan out across multiple committee
 * index URLs to widen coverage rather than rely on AJAX-rendered listings.
 *
 * Each committee gets its own connector so the orchestrator can attribute
 * items correctly and report per-source counts.
 */

interface ImoSource {
  id: string;
  label: string;
  /** URL of the committee's resolution index page. */
  url: string;
  /** Citation prefix — e.g. "MEPC" or "MSC". */
  committee: "MEPC" | "MSC";
}

const SOURCES: ImoSource[] = [
  {
    id: "imo-mepc",
    label: "IMO MEPC Resolutions",
    url: "https://www.imo.org/en/KnowledgeCentre/IndexofIMOResolutions/Pages/MEPC.aspx",
    committee: "MEPC",
  },
  {
    id: "imo-msc",
    label: "IMO MSC Resolutions",
    url: "https://www.imo.org/en/KnowledgeCentre/IndexofIMOResolutions/Pages/MSC.aspx",
    committee: "MSC",
  },
];

// Anchor-and-PDF pattern: <a href="...something.pdf">MEPC.123(45)</a>
// Or with intervening tags between href and citation.
const linkRegexFor = (committee: "MEPC" | "MSC") =>
  new RegExp(
    `<a[^>]+href="([^"]+(?:\\.pdf|/${committee}/[^"]+))"[^>]*>[\\s\\S]{0,200}?(${committee}\\.\\d{1,4}\\(\\d{1,3}\\))[\\s\\S]{0,200}?<\\/a>`,
    "gi",
  );

// Bare citation pattern — fallback when anchors don't match.
const bareRegexFor = (committee: "MEPC" | "MSC") =>
  new RegExp(`${committee}\\.(\\d{1,4})\\((\\d{1,3})\\)`, "gi");

function makeConnector(source: ImoSource): Connector {
  return {
    id: source.id,
    label: source.label,
    regulator_slug: "int-imo",

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: source.id,
        fetched: 0,
        errors: [],
        items: [],
      };

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${source.url}`);
        return result;
      }

      let html: string;
      try {
        const res = await fetch(source.url, {
          headers: {
            Accept: "text/html",
            "Accept-Language": "en",
            "User-Agent":
              "intelle-regwatch/0.1 (https://intelle.io/regwatch)",
          },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          result.errors.push(`HTTP ${res.status} from ${source.id}`);
          return result;
        }
        html = await res.text();
      } catch (e) {
        result.errors.push(`network: ${(e as Error).message}`);
        return result;
      }

      // First pass: link-anchored citations (preferred — preserves source URL).
      const matches = new Map<string, string>(); // citation -> source URL
      const linkRegex = linkRegexFor(source.committee);
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1];
        const citation = m[2];
        if (matches.has(citation)) continue;
        matches.set(citation, href);
        if (matches.size >= 75) break;
      }

      // Fallback: bare citations on the page, point at the index URL.
      if (matches.size === 0) {
        const bareRegex = bareRegexFor(source.committee);
        const found = new Set<string>();
        while ((m = bareRegex.exec(html)) !== null) {
          const citation = `${source.committee}.${m[1]}(${m[2]})`;
          if (!found.has(citation)) {
            found.add(citation);
            matches.set(citation, source.url);
          }
          if (matches.size >= 50) break;
        }
      }

      result.fetched = matches.size;
      const nowIso = ctx.now.toISOString();

      for (const [citation, href] of matches) {
        const fullUrl = href.startsWith("http")
          ? href
          : `https://www.imo.org${href.startsWith("/") ? "" : "/"}${href}`;
        const item: NormalisedItem = {
          regulator_slug: "int-imo",
          citation,
          slug: citationSlug(citation),
          title: `${citation} — IMO ${source.committee} Resolution`,
          instrument_type: "standard",
          status: "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: nowIso,
          last_changed_at: nowIso,
          source_url: fullUrl,
          summary: null,
          body_text: null,
          body_html: null,
          jurisdiction_code: "INT",
          topics:
            source.committee === "MEPC"
              ? ["bunker-spec", "emissions"]
              : ["process-safety", "worker-safety"],
        };
        result.items.push(item);
      }
      return result;
    },
  };
}

export const IMO_CONNECTORS: Connector[] = SOURCES.map(makeConnector);

// Backward-compatible export so the connectors registry doesn't need to change.
export const IMO_SCRAPER = IMO_CONNECTORS[0];
