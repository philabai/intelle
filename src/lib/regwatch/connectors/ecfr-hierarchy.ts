import type {
  Connector,
  ConnectorRunContext,
  HierarchyNode,
} from "./types";

/**
 * eCFR hierarchy adapter.
 *
 * The Federal Register publishers in this app (fr-epa, fr-osha, fr-bsee,
 * fr-blm, fr-phmsa, fr-sec) all live within the broader Code of Federal
 * Regulations tree. eCFR exposes the structure as JSON at
 *   https://www.ecfr.gov/api/versioner/v1/structure/{date}/title-{n}.json
 *
 * One Title's response is a recursive { type, label, identifier, children }
 * tree mirroring eCFR's official browse view (Title → Chapter → Subchapter
 * → Part → Subpart → Section). We surface it 1:1 — keeps the Vantage
 * browse byte-for-byte aligned with what users would see at ecfr.gov.
 *
 * Per-agency filtering: every agency publishes within specific Chapters
 * (EPA owns Title 40 Chapter I, OSHA Title 29 Chapter XVII, etc.). The
 * `attachHierarchy` factory takes that mapping so each Federal Register
 * connector exports its own scoped tree without re-fetching the whole
 * Title.
 */

const ECFR_STRUCTURE_BASE =
  "https://www.ecfr.gov/api/versioner/v1/structure";

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
  label: string;
  label_level?: string;
  label_description?: string;
  identifier: string;
  children?: EcfrNode[];
  reserved?: boolean;
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

function slugifyIdent(identifier: string): string {
  return identifier
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ecfrUrl(titleNumber: number, identifier: string): string {
  // The eCFR canonical URL pattern. Works for Part / Section / Chapter
  // identifiers; falls back gracefully for unrecognised forms.
  return `https://www.ecfr.gov/current/title-${titleNumber}/${identifier}`;
}

async function fetchTitleStructure(
  titleNumber: number,
  on: string,
  signal?: AbortSignal,
): Promise<EcfrNode | null> {
  const url = `${ECFR_STRUCTURE_BASE}/${on}/title-${titleNumber}.json`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)",
      Accept: "application/json",
    },
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as EcfrNode;
  return data;
}

interface ScopeFilter {
  /** Only descend into matching child identifiers at the top level. */
  chapter?: string;
  /** Optional subchapter filter; if set, prunes everything outside. */
  subchapter?: string;
}

function convertNode(
  node: EcfrNode,
  parentPath: string,
  titleNumber: number,
): HierarchyNode | null {
  if (node.reserved) return null;
  const slug = slugifyIdent(node.identifier);
  const path = parentPath ? `${parentPath}.${slug}` : slug;
  const children: HierarchyNode[] = [];
  for (const child of node.children ?? []) {
    const converted = convertNode(child, path, titleNumber);
    if (converted) children.push(converted);
  }

  const isLeafSection = node.type === "section" || node.type === "appendix";

  return {
    path,
    level: LEVEL_FOR_TYPE[node.type] ?? 4,
    level_label: LEVEL_LABEL_FOR_TYPE[node.type] ?? node.type,
    identifier: node.label_level
      ? `${node.label_level} ${node.identifier}`.trim()
      : node.identifier,
    title: node.label_description ?? node.label ?? null,
    citation: isLeafSection
      ? `${titleNumber} CFR ${node.identifier}`
      : null,
    source_url: ecfrUrl(titleNumber, node.identifier),
    children,
  };
}

function pruneToScope(
  title: EcfrNode,
  scope: ScopeFilter,
  titleNumber: number,
): HierarchyNode[] {
  const titlePath = `us.cfr.title_${titleNumber}`;
  const titleNode: HierarchyNode = {
    path: titlePath,
    level: 1,
    level_label: "Title",
    identifier: `Title ${titleNumber}`,
    title: title.label_description ?? title.label ?? null,
    citation: null,
    source_url: `https://www.ecfr.gov/current/title-${titleNumber}`,
    children: [],
  };

  for (const chapter of title.children ?? []) {
    if (scope.chapter && chapter.identifier !== scope.chapter) continue;
    const converted = convertNode(chapter, titlePath, titleNumber);
    if (!converted) continue;
    if (scope.subchapter) {
      converted.children = converted.children.filter(
        (c) =>
          c.identifier === scope.subchapter ||
          c.identifier === `Subchapter ${scope.subchapter}`,
      );
    }
    titleNode.children.push(converted);
  }

  return [titleNode];
}

export interface EcfrScope {
  titleNumber: number;
  chapter?: string;
  subchapter?: string;
}

/**
 * Wraps an existing Federal Register connector so it also reports a
 * scoped eCFR hierarchy slice. The wrapper preserves the connector's
 * original `run()` and adds `buildHierarchy()`.
 *
 * Usage in connectors/index.ts:
 *   import { attachEcfrHierarchy } from './ecfr-hierarchy';
 *   import { FEDERAL_REGISTER_CONNECTORS } from './federal-register';
 *
 *   const epa = FEDERAL_REGISTER_CONNECTORS.find(c => c.id === 'fr-epa')!;
 *   attachEcfrHierarchy(epa, { titleNumber: 40, chapter: 'I' });
 */
export function attachEcfrHierarchy(
  connector: Connector,
  scope: EcfrScope,
): Connector {
  connector.buildHierarchy = async (ctx: ConnectorRunContext) => {
    if (ctx.dryRun) return [];
    const onDate = ctx.now.toISOString().slice(0, 10);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 60_000);
    try {
      const title = await fetchTitleStructure(
        scope.titleNumber,
        onDate,
        ac.signal,
      );
      if (!title) return [];
      return pruneToScope(title, scope, scope.titleNumber);
    } catch (err) {
      // Hierarchy failures shouldn't block the regular crawl — the cron
      // will retry tomorrow.
      console.error(
        `[ecfr-hierarchy] ${connector.id} title-${scope.titleNumber}:`,
        err,
      );
      return [];
    } finally {
      clearTimeout(timer);
    }
  };
  return connector;
}

/** Default per-Federal-Register-connector scope mapping. */
export const FEDERAL_REGISTER_ECFR_SCOPES: Record<string, EcfrScope> = {
  "fr-epa": { titleNumber: 40, chapter: "I" },
  "fr-osha": { titleNumber: 29, chapter: "XVII" },
  "fr-bsee": { titleNumber: 30, chapter: "II" },
  "fr-blm": { titleNumber: 43, chapter: "II" },
  "fr-phmsa": { titleNumber: 49, chapter: "I" },
  "fr-sec": { titleNumber: 17, chapter: "II" },
};
