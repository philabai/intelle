import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  HierarchyNode,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * Canada Energy Regulator Act connector — C-15.1.
 *
 * Instead of scraping the fragile paginated HTML, we consume the official
 * Justice Laws LIMS XML, which is a single structured document:
 *   https://laws-lois.justice.gc.ca/eng/XML/C-15.1.xml
 *
 * The Body is a flat, in-document-order sequence of <Heading level="N"> and
 * <Section> elements. Parts are level-1 headings labelled "PART N", Divisions
 * are level-2 headings labelled "DIVISION N" (only under Part 7), and the
 * remaining headings are sub-groupings. We reconstruct the tree with a
 * heading-level stack and attach each <Section> as a leaf of the current
 * deepest heading.
 *
 *   run()           → one NormalisedItem per Section (primary-legislation),
 *                     with body_text filled inline from the XML (no separate
 *                     enrichment fetch needed — the XML already has the text).
 *   buildHierarchy() → ca.cer (Act) → Part → [Division] → Section leaf.
 *
 * Section citation = "Canadian Energy Regulator Act, s. N"; the leaf links to
 * the regulation detail page via persistHierarchy's citation resolution.
 */

const XML_URL = "https://laws-lois.justice.gc.ca/eng/XML/C-15.1.xml";
const SECTION_URL_BASE = "https://laws-lois.justice.gc.ca/eng/acts/C-15.1";
const ACT_TITLE = "Canadian Energy Regulator Act";
const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";

type NodeKind = "Part" | "Division" | "Heading";

interface ParsedHeading {
  kind: "heading";
  limsId: string;
  level: number; // raw LIMS heading level (1,2,3,5…)
  nodeKind: NodeKind;
  identifier: string; // "PART 1" / "DIVISION 1" / "Interpretation"
  title: string | null; // TitleText when there's also a Label
}

interface ParsedSection {
  kind: "section";
  limsId: string;
  label: string; // "1", "10", "11.1"
  marginalNote: string | null;
  bodyText: string;
  repealed: boolean;
}

type ParsedElement = ParsedHeading | ParsedSection;

function buildConnector(): Connector {
  return {
    id: "cer-act",
    label: "Canada Energy Regulator Act (C-15.1, Justice Laws XML)",
    regulator_slug: "ca-cer",

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: "cer-act",
        fetched: 0,
        errors: [],
        items: [],
      };
      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${XML_URL}`);
        return result;
      }

      let elements: ParsedElement[];
      try {
        const xml = await fetchText(XML_URL);
        elements = parseBody(xml);
      } catch (e) {
        result.errors.push(`xml fetch/parse: ${(e as Error).message}`);
        return result;
      }

      const sections = elements.filter(
        (e): e is ParsedSection => e.kind === "section",
      );
      if (sections.length === 0) {
        result.errors.push(
          "Zero sections parsed from the CER Act XML — the LIMS schema may have shifted.",
        );
        return result;
      }

      const nowIso = ctx.now.toISOString();
      for (const s of sections) {
        const citation = `${ACT_TITLE}, s. ${s.label}`;
        result.items.push({
          regulator_slug: "ca-cer",
          citation,
          slug: citationSlug(citation),
          title: s.marginalNote ?? `Section ${s.label}`,
          instrument_type: "primary-legislation",
          status: s.repealed ? "repealed" : "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: nowIso,
          last_changed_at: nowIso,
          source_url: `${SECTION_URL_BASE}/section-${encodeURIComponent(s.label)}.html`,
          summary: null,
          body_text: s.bodyText || null,
          body_html: null,
          jurisdiction_code: "CA",
          topics: deriveTopics(s.marginalNote, s.bodyText),
        });
      }
      result.fetched = result.items.length;
      return result;
    },

    async buildHierarchy(ctx: ConnectorRunContext): Promise<HierarchyNode[]> {
      if (ctx.dryRun) return [];
      try {
        const xml = await fetchText(XML_URL);
        const elements = parseBody(xml);
        return [assembleTree(elements)];
      } catch (e) {
        console.error("[cer-hierarchy]", (e as Error).message);
        return [];
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tree assembly — heading-level stack
// ---------------------------------------------------------------------------

function assembleTree(elements: ParsedElement[]): HierarchyNode {
  const root: HierarchyNode = {
    path: "ca.cer",
    level: 1,
    level_label: "Act",
    identifier: ACT_TITLE,
    title: null,
    citation: null,
    source_url: `${SECTION_URL_BASE}/FullText.html`,
    children: [],
  };

  // Stack of open heading nodes with their raw LIMS level.
  const stack: { rawLevel: number; node: HierarchyNode }[] = [];

  function currentParent(): HierarchyNode {
    return stack.length ? stack[stack.length - 1].node : root;
  }
  function currentPath(): string {
    return stack.length ? stack[stack.length - 1].node.path : root.path;
  }

  for (const el of elements) {
    if (el.kind === "heading") {
      // Pop any open headings at the same or deeper raw level.
      while (stack.length && stack[stack.length - 1].rawLevel >= el.level) {
        stack.pop();
      }
      const parent = currentParent();
      const node: HierarchyNode = {
        path: `${currentPath()}.h${el.limsId}`,
        level: depthOf(parent) + 1,
        level_label: el.nodeKind,
        identifier: el.identifier,
        title: el.title,
        citation: null,
        source_url: `${SECTION_URL_BASE}/FullText.html`,
        children: [],
      };
      parent.children.push(node);
      stack.push({ rawLevel: el.level, node });
    } else {
      const parent = currentParent();
      const citation = `${ACT_TITLE}, s. ${el.label}`;
      parent.children.push({
        path: `${currentPath()}.s${el.limsId}`,
        level: depthOf(parent) + 1,
        level_label: "Section",
        identifier: `s. ${el.label}`,
        title: el.marginalNote,
        citation,
        source_url: `${SECTION_URL_BASE}/section-${encodeURIComponent(el.label)}.html`,
        children: [],
      });
    }
  }

  return root;
}

/** Tree depth of a node by counting dots in its ltree path (root "ca.cer" = 1). */
function depthOf(node: HierarchyNode): number {
  return node.path.split(".").length - 1;
}

// ---------------------------------------------------------------------------
// XML parsing (regex walk over the flat Body sequence)
// ---------------------------------------------------------------------------

const ELEMENT_RE =
  /<(Heading|Section)\b([^>]*)>([\s\S]*?)<\/\1>/g;

function parseBody(xml: string): ParsedElement[] {
  // Restrict to <Body>…</Body> so the trailing Schedule / related provisions
  // don't leak in as stray sections.
  const bodyMatch = xml.match(/<Body\b[^>]*>([\s\S]*?)<\/Body>/);
  const body = bodyMatch ? bodyMatch[1] : xml;

  const out: ParsedElement[] = [];
  ELEMENT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ELEMENT_RE.exec(body)) !== null) {
    const tag = m[1];
    const attrs = m[2];
    const inner = m[3];
    const limsId = attr(attrs, "lims:id") ?? attr(attrs, "lims:fid") ?? "";

    if (tag === "Heading") {
      const level = Number(attr(attrs, "level") ?? "0") || 0;
      const label = firstTag(inner, "Label");
      const titleText = firstTag(inner, "TitleText");
      let nodeKind: NodeKind = "Heading";
      let identifier: string;
      let title: string | null = null;
      if (label && /^PART\b/i.test(label)) {
        nodeKind = "Part";
        identifier = label;
        title = titleText;
      } else if (label && /^DIVISION\b/i.test(label)) {
        nodeKind = "Division";
        identifier = label;
        title = titleText;
      } else if (label && /^SUBDIVISION\b/i.test(label)) {
        nodeKind = "Heading";
        identifier = label;
        title = titleText;
      } else {
        // Sub-grouping heading with no Label — use its TitleText as the name.
        identifier = titleText ?? label ?? "Section group";
      }
      out.push({ kind: "heading", limsId, level, nodeKind, identifier, title });
    } else {
      const label = firstTag(inner, "Label");
      if (!label) continue; // sections always carry a Label; skip if absent
      const marginalNote = firstTag(inner, "MarginalNote");
      const repealed = /\[\s*Repealed/i.test(marginalNote ?? "") ||
        /<Repealed\b/i.test(inner);
      out.push({
        kind: "section",
        limsId,
        label: clean(label),
        marginalNote: marginalNote ? clean(marginalNote) : null,
        bodyText: sectionText(inner),
        repealed,
      });
    }
  }
  return out;
}

/**
 * Build readable plain text for a section: drop the MarginalNote (that's the
 * title) and any HistoricalNote, insert line breaks at block boundaries, then
 * strip the remaining tags and decode entities.
 */
function sectionText(inner: string): string {
  const withoutMeta = inner
    .replace(/<MarginalNote\b[^>]*>[\s\S]*?<\/MarginalNote>/gi, "")
    .replace(/<HistoricalNote\b[^>]*>[\s\S]*?<\/HistoricalNote>/gi, "");
  const withBreaks = withoutMeta
    .replace(/<\/(Text|Paragraph|Subsection|Definition|Subparagraph|Clause|Provision)>/gi, "\n")
    .replace(/<Label\b[^>]*>/gi, " ")
    .replace(/<\/Label>/gi, " ");
  return clean(stripTags(withBreaks))
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveTopics(
  marginalNote: string | null,
  bodyText: string,
): string[] {
  const base = new Set<string>(["energy"]);
  const hay = `${marginalNote ?? ""} ${bodyText}`.toLowerCase();
  if (/pipeline/.test(hay)) base.add("pipelines");
  if (/power line|electricity|offshore renewable/.test(hay)) base.add("energy");
  if (/emission|greenhouse|methane|environment/.test(hay)) base.add("emissions");
  if (/methane/.test(hay)) base.add("methane");
  if (/licen[cs]|certificate|permit|authoriz|order/.test(hay))
    base.add("permitting");
  if (/report|record|file|submit/.test(hay)) base.add("reporting");
  return Array.from(base);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/xml,text/xml",
      "Accept-Language": "en-CA,en;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function attr(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name.replace(":", "\\:")}="([^"]*)"`, "i");
  const m = attrs.match(re);
  return m ? m[1] : null;
}

/** First direct-or-nested occurrence of <Tag>…</Tag>, inner text only. */
function firstTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? clean(stripTags(m[1])) : null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function clean(s: string): string {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘");
}

export const CER_CONNECTORS: Connector[] = [buildConnector()];
