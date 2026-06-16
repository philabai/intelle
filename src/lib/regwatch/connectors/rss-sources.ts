import { XMLParser } from "fast-xml-parser";
import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * Industry-news RSS connector. Unlike the regulatory connectors, these are
 * public news/analysis feeds whose items are ingested as `instrument_type:
 * 'notice'` (regwatch's "news" bucket) and used downstream as Outreach content
 * seeds for the Industry Newsjack + MEA Compliance pillars. They land under two
 * synthetic "news-source" regulators (news-energy, news-mea) so they stay
 * separable from real regulations in the corpus.
 *
 * Feeds are public RSS 2.0 / Atom. Edit FEEDS to curate sources. A broken or
 * slow feed only contributes errors — it never aborts the run.
 */
export interface NewsFeed {
  id: string;
  url: string;
  label: string;
  /** Synthetic regulator slug: 'news-energy' (global) or 'news-mea' (region). */
  regulator_slug: "news-energy" | "news-mea";
  /** ISO jurisdiction proxy used for geo routing (INT, AE, …). */
  jurisdiction_code: string;
  /** Optional topic hints; enrichment re-tags against the taxonomy anyway. */
  topics?: string[];
}

// Proposed default set — public energy/climate/compliance feeds + MEA-region
// sources. Curate freely; the connector tolerates dead feeds.
export const FEEDS: NewsFeed[] = [
  { id: "carbonbrief", url: "https://www.carbonbrief.org/feed/", label: "Carbon Brief", regulator_slug: "news-energy", jurisdiction_code: "INT", topics: ["emissions", "energy-transition"] },
  { id: "esgtoday", url: "https://www.esgtoday.com/feed/", label: "ESG Today", regulator_slug: "news-energy", jurisdiction_code: "INT", topics: ["reporting", "carbon-market"] },
  { id: "pvmagazine", url: "https://www.pv-magazine.com/feed/", label: "pv magazine", regulator_slug: "news-energy", jurisdiction_code: "INT", topics: ["renewables", "power"] },
  { id: "energyvoice", url: "https://www.energyvoice.com/feed/", label: "Energy Voice", regulator_slug: "news-energy", jurisdiction_code: "INT", topics: ["energy", "fuels"] },
  { id: "zawya-energy", url: "https://www.zawya.com/en/rss/feed/markets/commodities", label: "Zawya — Commodities", regulator_slug: "news-mea", jurisdiction_code: "AE", topics: ["energy", "gulf"] },
  { id: "thenational-energy", url: "https://www.thenationalnews.com/business/energy/rss/", label: "The National — Energy", regulator_slug: "news-mea", jurisdiction_code: "AE", topics: ["energy", "gulf"] },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Unwrap CDATA / objects / {#text} into a plain string. */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return o["#text"];
    if (typeof o["@_href"] === "string") return o["@_href"];
  }
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Normalize one RSS <item> or Atom <entry> into a NormalisedItem. */
function normalize(feed: NewsFeed, node: Record<string, unknown>, now: Date): NormalisedItem | null {
  const title = stripHtml(text(node.title));
  if (!title) return null;

  // Link: RSS <link>text</link>; Atom <link href=…> (often several rels).
  let link = "";
  const rawLink = node.link;
  if (typeof rawLink === "string") link = rawLink;
  else {
    const links = asArray(rawLink as Record<string, unknown>[]);
    const alt = links.find((l) => l?.["@_rel"] === "alternate") ?? links[0];
    link = alt ? text(alt) : "";
  }
  link = link || text(node.id) || text(node.guid);
  if (!link) return null;

  const guid = text(node.guid) || text(node.id) || link;
  const citation = `${feed.id}:${guid}`.slice(0, 180);

  const descRaw = text(node.description) || text(node.summary) || text((node.content as Record<string, unknown>)?.["#text"] ?? node.content);
  const summary = stripHtml(descRaw).slice(0, 1200) || title;

  const published =
    parseDate(text(node.pubDate)) ??
    parseDate(text(node.published)) ??
    parseDate(text(node.updated)) ??
    parseDate(text((node["dc:date"] as string))) ??
    now;

  return {
    regulator_slug: feed.regulator_slug,
    citation,
    slug: citationSlug(citation),
    title: title.slice(0, 500),
    instrument_type: "notice",
    status: "in-force",
    effective_date: null,
    proposed_date: null,
    consultation_closes_at: null,
    published_at: published.toISOString(),
    last_changed_at: published.toISOString(),
    source_url: link,
    summary,
    body_text: summary,
    body_html: typeof descRaw === "string" ? descRaw : null,
    jurisdiction_code: feed.jurisdiction_code,
    topics: feed.topics ?? [],
  };
}

async function fetchFeed(feed: NewsFeed, since: Date, result: ConnectorResult): Promise<void> {
  let xml: string;
  try {
    const res = await fetch(feed.url, {
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "intelle-outreach/0.1 (+https://intelle.io)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      result.errors.push(`${feed.id}: HTTP ${res.status}`);
      return;
    }
    xml = await res.text();
  } catch (e) {
    result.errors.push(`${feed.id}: ${(e as Error).message}`);
    return;
  }

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    result.errors.push(`${feed.id}: parse ${(e as Error).message}`);
    return;
  }

  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const atom = doc.feed as Record<string, unknown> | undefined;
  const nodes = channel ? asArray(channel.item as Record<string, unknown>[]) : asArray(atom?.entry as Record<string, unknown>[]);

  result.fetched += nodes.length;
  for (const node of nodes) {
    const item = normalize(feed, node, new Date());
    if (!item) continue;
    if (new Date(item.published_at) < since) continue;
    result.items.push(item);
  }
}

export const RSS_NEWS_CONNECTORS: Connector[] = [
  {
    id: "rss-news",
    label: "Industry News (RSS)",
    regulator_slug: "news-energy",
    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = { source: "rss-news", fetched: 0, errors: [], items: [] };
      const since = new Date(ctx.now.getTime() - ctx.lookbackDays * 86_400_000);
      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${FEEDS.length} feeds`);
        return result;
      }
      for (const feed of FEEDS) {
        await fetchFeed(feed, since, result);
      }
      // De-dupe within the run by citation (a feed can repeat a guid).
      const seen = new Set<string>();
      result.items = result.items.filter((i) => {
        const key = `${i.regulator_slug}::${i.citation}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return result;
    },
  },
];
