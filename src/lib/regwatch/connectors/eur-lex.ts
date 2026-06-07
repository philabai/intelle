import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  InstrumentType,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * EUR-Lex connector — Phase 1.7 fix.
 *
 * The previous Atom-feed implementation returned malformed XML from
 * eur-lex.europa.eu, so the parser extracted 0 entries. This rewrite drops
 * the Atom format entirely and scrapes the standard EUR-Lex advanced-search
 * HTML page for CELEX numbers + titles. The search HTML is keyless and far
 * more stable than the Atom rendering.
 *
 * Each search URL is filtered by a EuroVoc topic descriptor that maps to
 * the regulator we're attributing items to (DG CLIMA → climate-related;
 * DG ENER → energy-related). EuroVoc descriptors are stable identifiers
 * published by the EU.
 */

const SEARCH_BASE = "https://eur-lex.europa.eu/search.html";

// Match CELEX numbers in URLs. Format: 1-digit sector, 4-digit year, 1-letter type
// (R=Regulation, L=Directive, D=Decision, etc.), 4+ digits. Example: 32024R1787
const CELEX_REGEX = /CELEX[:%3A]?([1-9]\d{4}[A-Z]\d{4,})/gi;

// Match the article title that follows each CELEX link in the EUR-Lex search HTML.
// The structure is roughly: <h2 class="title"><a href="...CELEX...">TITLE</a></h2>
// We capture the inner text of the first anchor following each CELEX URL.
const TITLE_AFTER_CELEX_REGEX =
  /CELEX[:%3A]?([1-9]\d{4}[A-Z]\d{4,})[^>]*>\s*([^<][^<]{10,400}?)\s*<\/a>/gi;

function instrumentTypeFromCelex(celex: string): InstrumentType {
  // CELEX format: <sector><year><type><number>
  // Type letter is character index 5 (zero-indexed).
  const typeChar = celex.charAt(5).toUpperCase();
  switch (typeChar) {
    case "R": // Regulation
    case "L": // Directive
      return "primary-legislation";
    case "D": // Decision
    case "H": // Recommendation
      return "secondary-legislation";
    case "C": // Communication
    case "X": // Notice
      return "guidance";
    default:
      return "primary-legislation";
  }
}

/**
 * Build the canonical EUR-Lex source URL from a CELEX number.
 *
 * Uses the ELI (European Legislation Identifier) form
 *   https://eur-lex.europa.eu/eli/reg/2024/1787
 * for Regulations / Directives / Decisions when the CELEX type maps
 * to a known ELI subtype, because ELI is the W3C-recommended stable
 * identifier and bypasses the older `/legal-content/?uri=CELEX:...`
 * redirect layer that occasionally returns a "Document not found"
 * page. For CELEX types that don't have an ELI mapping
 * (Communications, Notices, Treaties, etc.) we keep the legacy
 * format so the URL still resolves.
 */
function sourceUrlFromCelex(celex: string): string {
  if (celex.length < 7) {
    return `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`;
  }
  const year = celex.slice(1, 5);
  const typeChar = celex.charAt(5).toUpperCase();
  const number = celex.slice(6).replace(/^0+/, "") || "0";
  const eliSubtype =
    typeChar === "R" ? "reg" : typeChar === "L" ? "dir" : typeChar === "D" ? "dec" : null;
  if (eliSubtype) {
    return `https://eur-lex.europa.eu/eli/${eliSubtype}/${year}/${number}`;
  }
  return `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`;
}

interface ConnectorConfig {
  id: string;
  label: string;
  regulator_slug: string;
  /** EuroVoc descriptor URI for topic filtering (or null for no topic filter). */
  topic: string | null;
}

function makeConnector(cfg: ConnectorConfig): Connector {
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

      // Build a search URL with sort=date desc + topic filter when provided.
      // No date filter — we filter client-side using ctx.lookbackDays so we
      // don't depend on EUR-Lex's date-query syntax.
      const params = new URLSearchParams({
        lang: "en",
        type: "advanced",
        SUBDOM_INIT: "LEGISLATION",
        DTS_DOM: "EU_LAW",
        DTS_SUBDOM: "LEGISLATION",
        sortBy: "DOCDATE",
        sortOrder: "DESC",
      });
      if (cfg.topic) params.set("EuroVoc", cfg.topic);
      const url = `${SEARCH_BASE}?${params.toString()}`;

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${url}`);
        return result;
      }

      let html: string;
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en",
            "User-Agent":
              "intelle-regwatch/0.1 (https://intelle.io/regwatch)",
          },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          result.errors.push(`HTTP ${res.status} from EUR-Lex search`);
          return result;
        }
        html = await res.text();
      } catch (e) {
        result.errors.push(`network: ${(e as Error).message}`);
        return result;
      }

      // First pass — extract CELEX → title pairs from the result anchors.
      const byCelex = new Map<string, string>();
      let m: RegExpExecArray | null;
      while ((m = TITLE_AFTER_CELEX_REGEX.exec(html)) !== null) {
        const celex = m[1].toUpperCase();
        const title = decodeHtmlEntities(stripTags(m[2])).trim();
        if (!byCelex.has(celex) && title.length > 0) {
          byCelex.set(celex, title);
        }
        if (byCelex.size >= 50) break;
      }

      // Fallback — if the title-anchor pattern matched nothing (template
      // changed), pull every CELEX number we can find with no title.
      if (byCelex.size === 0) {
        CELEX_REGEX.lastIndex = 0;
        while ((m = CELEX_REGEX.exec(html)) !== null) {
          const celex = m[1].toUpperCase();
          if (!byCelex.has(celex)) {
            byCelex.set(celex, `EU document ${celex}`);
          }
          if (byCelex.size >= 25) break;
        }
      }

      result.fetched = byCelex.size;
      const nowIso = ctx.now.toISOString();

      for (const [celex, title] of byCelex) {
        // Emit human-readable citation + slug instead of the raw
        // CELEX form. Matches the seed convention (20260605):
        //   "Regulation (EU) 2024/1787"  /  "eu-reg-2024-1787"
        // so the URL doesn't have 'celex' in it and the citation
        // chip in the UI reads naturally.
        const parsed = parseCelex(celex);
        const citation = parsed ? humanCitation(parsed) : `EU Act ${celex}`;
        const slug = parsed ? humanSlug(parsed) : citationSlug(`eu-${celex}`);
        const sourceUrl = sourceUrlFromCelex(celex);
        const item: NormalisedItem = {
          regulator_slug: cfg.regulator_slug,
          citation,
          slug,
          title,
          instrument_type: instrumentTypeFromCelex(celex),
          status: "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: nowIso,
          last_changed_at: nowIso,
          source_url: sourceUrl,
          summary: null,
          body_text: null,
          body_html: null,
          jurisdiction_code: "EU",
        };
        result.items.push(item);
      }
      return result;
    },
  };
}

interface ParsedCelex {
  year: string;
  typeChar: string;
  number: number;
}

function parseCelex(celex: string): ParsedCelex | null {
  const m = celex.match(/^3(\d{4})([A-Z])0*(\d+)/);
  if (!m) return null;
  return { year: m[1], typeChar: m[2].toUpperCase(), number: parseInt(m[3], 10) };
}

function typeLabel(typeChar: string): string {
  return (
    {
      R: "Regulation",
      L: "Directive",
      D: "Decision",
      H: "Recommendation",
      C: "Communication",
      X: "Notice",
    }[typeChar] ?? "EU Act"
  );
}

function typeSlugSegment(typeChar: string): string {
  return (
    {
      R: "reg",
      L: "dir",
      D: "dec",
      H: "rec",
      C: "com",
      X: "notice",
    }[typeChar] ?? "act"
  );
}

function humanCitation(p: ParsedCelex): string {
  return `${typeLabel(p.typeChar)} (EU) ${p.year}/${p.number}`;
}

function humanSlug(p: ParsedCelex): string {
  return `eu-${typeSlugSegment(p.typeChar)}-${p.year}-${p.number}`;
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
    .replace(/&nbsp;/g, " ");
}

// EuroVoc descriptors:
//   "Climate change" = 5829
//   "Energy policy" = 4424
//   See https://eur-lex.europa.eu/browse/eurovoc.html
export const EUR_LEX_CONNECTORS: Connector[] = [
  makeConnector({
    id: "eurlex-dg-clima",
    label: "EUR-Lex — DG CLIMA (climate change)",
    regulator_slug: "eu-dg-clima",
    topic: "5829",
  }),
  makeConnector({
    id: "eurlex-dg-ener",
    label: "EUR-Lex — DG Energy (energy policy)",
    regulator_slug: "eu-dg-ener",
    topic: "4424",
  }),
];
