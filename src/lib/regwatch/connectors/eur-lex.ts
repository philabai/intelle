import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  InstrumentType,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * EUR-Lex connector — uses the EUR-Lex public search webservice (Atom feed)
 * to discover recent CELEX-numbered acts under selected EuroVoc topics.
 *
 * EUR-Lex offers a SOAP webservice for authenticated users and a richer
 * SPARQL endpoint, but the public Atom feed at /search.html?format=atom is
 * keyless and adequate for a 15-min polling cadence.
 *
 * Phase 1.x can swap in the SPARQL endpoint for cleaner taxonomy and richer
 * subject-matter filters.
 */
const ATOM_BASE = "https://eur-lex.europa.eu/search.html";

interface AtomEntry {
  title: string;
  summary: string;
  updated: string;
  link: string;
  id: string;
  celex: string | null;
}

function parseAtomXml(xml: string): AtomEntry[] {
  // Lightweight extractor — avoids pulling a full XML parser dep. EUR-Lex
  // Atom entries are well-formed; we extract title, summary, updated, link, id.
  const entries: AtomEntry[] = [];
  const entryBlocks = xml.split(/<entry[\s>]/i).slice(1);
  for (const raw of entryBlocks) {
    const body = raw.split(/<\/entry>/i)[0];
    if (!body) continue;
    const title = pick(body, "title");
    const summary = pick(body, "summary");
    const updated = pick(body, "updated");
    const id = pick(body, "id");
    const linkMatch = body.match(/<link[^>]*href="([^"]+)"/i);
    const link = linkMatch?.[1] ?? id;
    const celex = id.match(/CELEX[:%3A]([0-9A-Z]+)/i)?.[1] ?? null;
    if (title && link) {
      entries.push({
        title: decodeXmlEntities(title),
        summary: decodeXmlEntities(summary ?? ""),
        updated: updated ?? new Date().toISOString(),
        link,
        id,
        celex,
      });
    }
  }
  return entries;
}

function pick(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1]?.trim() ?? "";
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function instrumentTypeFromCelex(celex: string | null): InstrumentType {
  if (!celex) return "primary-legislation";
  // CELEX sector 3 = legal acts; subsector R = regulations, L = directives
  const c = celex.toUpperCase();
  if (c.includes("R")) return "primary-legislation";
  if (c.includes("L")) return "primary-legislation";
  if (c.includes("D")) return "secondary-legislation";
  if (c.includes("H")) return "guidance";
  return "primary-legislation";
}

function makeConnector(args: {
  id: string;
  label: string;
  regulator_slug: string;
  /** EUR-Lex DTS (document type set) filter, e.g. "REG_IMPL" for implementing regulations. */
  documentTypeSet?: string;
  /** EuroVoc descriptor filter — narrows by topic. */
  topicFilter?: string;
}): Connector {
  return {
    id: args.id,
    label: args.label,
    regulator_slug: args.regulator_slug,

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: args.id,
        fetched: 0,
        errors: [],
        items: [],
      };

      const since = new Date(
        ctx.now.getTime() - ctx.lookbackDays * 24 * 60 * 60 * 1000,
      );
      const params = new URLSearchParams({
        scope: "EURLEX",
        format: "atom",
        SUBDOM_INIT: "ALL_ALL",
        DTS_DOM: "EU_LAW",
        DTS_SUBDOM: "LEGISLATION",
        page: "1",
        sortField: "DATE_PUBLICATION",
        sortOrder: "desc",
      });
      if (args.documentTypeSet) params.set("FM_CODED", args.documentTypeSet);
      if (args.topicFilter) params.set("EuroVoc", args.topicFilter);
      params.set(
        "DD_YEAR",
        String(since.getUTCFullYear()),
      );
      const url = `${ATOM_BASE}?${params.toString()}`;

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${url}`);
        return result;
      }

      let xml: string;
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/atom+xml",
            "User-Agent": "intelle-regwatch/0.1",
          },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          result.errors.push(`HTTP ${res.status} from EUR-Lex`);
          return result;
        }
        xml = await res.text();
      } catch (e) {
        result.errors.push(`network: ${(e as Error).message}`);
        return result;
      }

      const entries = parseAtomXml(xml);
      result.fetched = entries.length;

      const sinceMs = since.getTime();
      for (const entry of entries) {
        const updatedMs = new Date(entry.updated).getTime();
        if (isFinite(updatedMs) && updatedMs < sinceMs) continue;
        const citation = entry.celex
          ? `CELEX:${entry.celex}`
          : entry.title.slice(0, 80);
        const item: NormalisedItem = {
          regulator_slug: args.regulator_slug,
          citation,
          slug: citationSlug(citation),
          title: entry.title,
          instrument_type: instrumentTypeFromCelex(entry.celex),
          status: "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: entry.updated,
          last_changed_at: entry.updated,
          source_url: entry.link,
          summary: entry.summary,
          body_text: entry.summary,
          body_html: null,
          jurisdiction_code: "EU",
        };
        result.items.push(item);
      }
      return result;
    },
  };
}

export const EUR_LEX_CONNECTORS: Connector[] = [
  makeConnector({
    id: "eurlex-dg-clima",
    label: "EUR-Lex — DG CLIMA",
    regulator_slug: "eu-dg-clima",
  }),
  makeConnector({
    id: "eurlex-dg-ener",
    label: "EUR-Lex — DG Energy",
    regulator_slug: "eu-dg-ener",
  }),
];
