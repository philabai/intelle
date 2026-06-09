import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  HierarchyNode,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * eCFR whole-Title connector.
 *
 * Consumes the eCFR structure JSON for a full CFR Title (all chapters/agencies):
 *   https://www.ecfr.gov/api/versioner/v1/structure/{date}/title-{n}.json
 *
 * Unlike the per-agency `attachEcfrHierarchy` adapter (which scopes a Federal
 * Register connector to one Chapter and only labels section leaves), this
 * connector owns an entire Title as one publisher and:
 *
 *   - run()            → emits one regulatory_item PER PART (e.g. "10 CFR Part
 *                        50"). Parts are the citeable unit that feeds the list /
 *                        topics / search. ~201 items for Title 10.
 *   - buildHierarchy() → the full Title→Chapter→Subchapter→Part→Subpart→
 *                        [Subject group]→Section/Appendix tree (~6.6k nodes).
 *                        PART nodes carry citation "{n} CFR Part {id}" so
 *                        persistHierarchy links them to the Part items; SECTION
 *                        nodes carry a real ecfr.gov source_url and NO citation,
 *                        so the browse tree deep-links them out (no per-section
 *                        items, no 404s).
 *
 * Path convention matches the existing eCFR adapter: us.cfr.title_10.chapter_i…
 */

const STRUCTURE_BASE = "https://www.ecfr.gov/api/versioner/v1/structure";
const TITLES_URL = "https://www.ecfr.gov/api/versioner/v1/titles.json";
const ECFR_BASE = "https://www.ecfr.gov";
const FETCH_TIMEOUT_MS = 60_000;
const USER_AGENT =
  "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";

interface EcfrNode {
  type:
    | "title"
    | "chapter"
    | "subchapter"
    | "part"
    | "subpart"
    | "section"
    | "subject_group"
    | "appendix";
  identifier: string;
  label?: string;
  label_level?: string;
  label_description?: string;
  reserved?: boolean;
  children?: EcfrNode[];
}

const LEVEL_FOR_TYPE: Record<EcfrNode["type"], number> = {
  title: 1,
  chapter: 2,
  subchapter: 3,
  part: 4,
  subpart: 5,
  subject_group: 5,
  section: 6,
  appendix: 6,
};

const LEVEL_LABEL_FOR_TYPE: Record<EcfrNode["type"], string> = {
  title: "Title",
  chapter: "Chapter",
  subchapter: "Subchapter",
  part: "Part",
  subpart: "Subpart",
  subject_group: "Subject group",
  section: "Section",
  appendix: "Appendix",
};

export interface EcfrTitleConnectorArgs {
  id: string; // e.g. "ecfr-title-10"
  regulatorSlug: string; // e.g. "us-cfr-10"
  titleNumber: number; // e.g. 10
  label: string; // human label
}

export function buildEcfrTitleConnector(args: EcfrTitleConnectorArgs): Connector {
  const { id, regulatorSlug, titleNumber, label } = args;

  return {
    id,
    label,
    regulator_slug: regulatorSlug,

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: id,
        fetched: 0,
        errors: [],
        items: [],
      };
      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch title-${titleNumber} structure`);
        return result;
      }

      let root: EcfrNode;
      try {
        root = await fetchStructure(titleNumber, ctx.now);
      } catch (e) {
        result.errors.push(`structure fetch: ${(e as Error).message}`);
        return result;
      }

      const nowIso = ctx.now.toISOString();
      const parts = collectParts(root);
      for (const { node, agency } of parts) {
        const citation = `${titleNumber} CFR Part ${node.identifier}`;
        result.items.push({
          regulator_slug: regulatorSlug,
          citation,
          slug: citationSlug(citation),
          title:
            cleanText(node.label_description ?? node.label ?? "") ||
            `Part ${node.identifier}`,
          instrument_type: "secondary-legislation",
          status: "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: nowIso,
          last_changed_at: nowIso,
          source_url: partUrl(titleNumber, node.identifier),
          summary: null,
          body_text: null,
          body_html: null,
          jurisdiction_code: "US",
          topics: deriveTopics(titleNumber, agency, node.label_description ?? ""),
        });
      }
      result.fetched = result.items.length;
      return result;
    },

    async buildHierarchy(ctx: ConnectorRunContext): Promise<HierarchyNode[]> {
      if (ctx.dryRun) return [];
      let root: EcfrNode;
      try {
        root = await fetchStructure(titleNumber, ctx.now);
      } catch (e) {
        console.error(`[ecfr-title-${titleNumber} hierarchy]`, (e as Error).message);
        return [];
      }

      const titlePath = `us.cfr.title_${titleNumber}`;
      const titleNode: HierarchyNode = {
        path: titlePath,
        level: 1,
        level_label: "Title",
        identifier: `Title ${titleNumber}`,
        title: cleanText(root.label_description ?? root.label ?? null),
        citation: null,
        source_url: `${ECFR_BASE}/current/title-${titleNumber}`,
        children: [],
      };
      (root.children ?? []).forEach((child, i) => {
        const converted = convertNode(child, titlePath, titleNumber, null, i);
        if (converted) titleNode.children.push(converted);
      });
      return [titleNode];
    },
  };
}

// ---------------------------------------------------------------------------
// Hierarchy conversion
// ---------------------------------------------------------------------------

function convertNode(
  node: EcfrNode,
  parentPath: string,
  titleNumber: number,
  partId: string | null,
  index = 0,
): HierarchyNode | null {
  if (node.reserved) return null;

  // Some nodes (rarely) lack an identifier; fall back to label/type + sibling
  // index so the ltree path stays unique and never collides.
  const segment =
    slugifyIdent(node.identifier ?? node.label_level ?? "") ||
    `${node.type}_${index}`;
  const path = `${parentPath}.${segment}`;
  const currentPart = node.type === "part" ? node.identifier : partId;

  const children: HierarchyNode[] = [];
  (node.children ?? []).forEach((child, i) => {
    const converted = convertNode(child, path, titleNumber, currentPart, i);
    if (converted) children.push(converted);
  });

  // Only PART nodes carry a citation (→ links to the Part regulatory_item).
  // Sections/appendices link out via source_url instead, so we skip their
  // citation entirely — this also avoids thousands of pointless item lookups
  // in persistHierarchy.
  const citation =
    node.type === "part" ? `${titleNumber} CFR Part ${node.identifier}` : null;

  return {
    path,
    level: LEVEL_FOR_TYPE[node.type] ?? 6,
    level_label: LEVEL_LABEL_FOR_TYPE[node.type] ?? node.type,
    identifier:
      cleanText(node.label_level ?? node.identifier) ??
      String(node.identifier ?? node.type),
    title: cleanText(node.label_description ?? null),
    citation,
    source_url: nodeUrl(node, titleNumber, currentPart),
    children,
  };
}

// ---------------------------------------------------------------------------
// Part collection (for run() items) + agency context
// ---------------------------------------------------------------------------

function collectParts(
  root: EcfrNode,
): { node: EcfrNode; agency: string }[] {
  const out: { node: EcfrNode; agency: string }[] = [];
  function walk(node: EcfrNode, agency: string) {
    const nextAgency =
      node.type === "chapter"
        ? cleanText(node.label_description ?? node.label ?? agency) ?? agency
        : agency;
    if (node.type === "part" && !node.reserved) {
      out.push({ node, agency: nextAgency });
    }
    for (const child of node.children ?? []) walk(child, nextAgency);
  }
  walk(root, "");
  return out;
}

/** Per-title fallback so every part has at least one topic. */
const TITLE_DEFAULT_TOPIC: Record<number, string> = {
  10: "energy",
  14: "aviation",
  21: "drugs",
};

function deriveTopics(
  titleNumber: number,
  agency: string,
  partTitle: string,
): string[] {
  const topics = new Set<string>();
  const hay = `${agency} ${partTitle}`.toLowerCase();

  // Cross-title keyword signals.
  if (/licen[cs]|certif|application|approval|permit|registration/.test(hay))
    topics.add("permitting");
  if (/report|record|inform|disclosure|filing/.test(hay)) topics.add("reporting");
  if (/environment|nepa|emission|greenhouse|air quality|noise/.test(hay))
    topics.add("emissions");
  if (/occupational|worker|workplace/.test(hay)) topics.add("worker-safety");

  // Title 10 — Energy (NRC + DOE).
  if (titleNumber === 10) {
    topics.add("energy");
    if (/nuclear|reactor|radioact|byproduct|source material|spent fuel|enrich/.test(hay))
      topics.add("nuclear");
    if (/radiation|dose|dosimetr/.test(hay)) topics.add("radiation");
    if (/efficien|conservation|appliance|standby|energy star/.test(hay))
      topics.add("energy");
  }

  // Title 14 — Aeronautics and Space (FAA + Commercial Space + NASA).
  if (titleNumber === 14) {
    topics.add("aviation");
    if (/space|launch|orbital|satellite|reentry|spaceport|astronaut/.test(hay))
      topics.add("aerospace");
    if (/airworthiness|aircraft|airport|airman|airspace|flight|pilot|drone|unmanned/.test(hay))
      topics.add("aviation");
  }

  // Title 21 — Food and Drugs (FDA + DEA).
  if (titleNumber === 21) {
    if (/food|dietary|nutrition|beverage|color additive|infant formula/.test(hay))
      topics.add("food-safety");
    if (/drug|pharmaceutic|biologic|prescription|controlled substance|narcotic|opioid/.test(hay))
      topics.add("drugs");
    if (/device|radiolog|diagnostic|in vitro|mammograph/.test(hay))
      topics.add("medical-devices");
    if (/cosmetic/.test(hay)) topics.add("cosmetics");
    if (/tobacco|cigarette|vap/.test(hay)) topics.add("tobacco");
    if (/radiation|radiolog|x-ray|laser/.test(hay)) topics.add("radiation");
    if (/chemical|substance/.test(hay)) topics.add("chemicals");
  }

  if (topics.size === 0) {
    topics.add(TITLE_DEFAULT_TOPIC[titleNumber] ?? "reporting");
  }
  return Array.from(topics);
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

function partUrl(titleNumber: number, partId: string): string {
  return `${ECFR_BASE}/current/title-${titleNumber}/part-${encodeURIComponent(partId)}`;
}

function nodeUrl(
  node: EcfrNode,
  titleNumber: number,
  partId: string | null,
): string {
  const base = `${ECFR_BASE}/current/title-${titleNumber}`;
  switch (node.type) {
    case "chapter":
      return `${base}/chapter-${encodeURIComponent(node.identifier)}`;
    case "subchapter":
      return `${base}/subchapter-${encodeURIComponent(node.identifier)}`;
    case "part":
      return `${base}/part-${encodeURIComponent(node.identifier)}`;
    case "section":
      return `${base}/section-${encodeURIComponent(node.identifier)}`;
    case "subpart":
      return partId
        ? `${base}/part-${encodeURIComponent(partId)}/subpart-${encodeURIComponent(node.identifier)}`
        : base;
    case "appendix": {
      const m = node.identifier.match(/Part\s+(\w+)/i);
      return m ? `${base}/part-${encodeURIComponent(m[1])}` : base;
    }
    default:
      // subject_group + anything else — fall back to the enclosing part page.
      return partId ? `${base}/part-${encodeURIComponent(partId)}` : base;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchStructure(
  titleNumber: number,
  now: Date,
): Promise<EcfrNode> {
  // eCFR only has a structure for dates it has actually issued. Today's date
  // (or a clock ahead of eCFR's publish lag) 404s, so resolve the title's
  // latest issued date from titles.json first.
  const onDate = await resolveLatestDate(titleNumber, now);
  const url = `${STRUCTURE_BASE}/${onDate}/title-${titleNumber}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return (await res.json()) as EcfrNode;
}

interface TitleMeta {
  number: number;
  latest_issue_date?: string;
  up_to_date_as_of?: string;
}

async function resolveLatestDate(titleNumber: number, now: Date): Promise<string> {
  try {
    const res = await fetch(TITLES_URL, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = (await res.json()) as { titles?: TitleMeta[] };
      const t = (data.titles ?? []).find((x) => x.number === titleNumber);
      const date = t?.latest_issue_date ?? t?.up_to_date_as_of;
      if (date) return date;
    }
  } catch {
    // fall through to the clock date
  }
  return now.toISOString().slice(0, 10);
}

function slugifyIdent(identifier: string | null | undefined): string {
  return (
    String(identifier ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "x"
  );
}

function cleanText(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = s
    .replace(/\s+/g, " ")
    .replace(/\s*\[Reserved\]\s*/gi, "")
    .trim();
  return t || null;
}

export const ECFR_TITLE_CONNECTORS: Connector[] = [
  buildEcfrTitleConnector({
    id: "ecfr-title-10",
    regulatorSlug: "us-cfr-10",
    titleNumber: 10,
    label: "eCFR — Title 10 (Energy)",
  }),
  buildEcfrTitleConnector({
    id: "ecfr-title-14",
    regulatorSlug: "us-cfr-14",
    titleNumber: 14,
    label: "eCFR — Title 14 (Aeronautics and Space)",
  }),
  buildEcfrTitleConnector({
    id: "ecfr-title-21",
    regulatorSlug: "us-cfr-21",
    titleNumber: 21,
    label: "eCFR — Title 21 (Food and Drugs)",
  }),
];
