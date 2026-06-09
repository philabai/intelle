import { createServiceClient } from "./supabase/service";

/**
 * Read-side helpers for the regulatory_sections hierarchy. The browse
 * pages render this tree directly — no client-side fetch — so these
 * helpers stay server-only and chunk the response by jurisdiction or
 * subtree to keep payloads sane (a full eCFR Title is ~12k nodes).
 */

export interface SectionNode {
  id: string;
  parentSectionId: string | null;
  level: number;
  levelLabel: string;
  identifier: string;
  title: string | null;
  citation: string | null;
  regulatoryItemId: string | null;
  path: string;
  childCount: number;
  hasUpdates30d: boolean;
  lastChangedAt: string | null;
  sourceUrl: string | null;
  /** Children are populated by the build step, not by the query. */
  children: SectionNode[];
}

interface SectionRow {
  id: string;
  regulator_id: string;
  jurisdiction_code: string;
  parent_section_id: string | null;
  level: number;
  level_label: string;
  identifier: string;
  title: string | null;
  citation: string | null;
  regulatory_item_id: string | null;
  path: string;
  child_count: number;
  has_updates_30d: boolean;
  last_changed_at: string | null;
  source_url: string | null;
}

function rowToNode(r: SectionRow): SectionNode {
  return {
    id: r.id,
    parentSectionId: r.parent_section_id,
    level: r.level,
    levelLabel: r.level_label,
    identifier: r.identifier,
    title: r.title,
    citation: r.citation,
    regulatoryItemId: r.regulatory_item_id,
    path: r.path,
    childCount: r.child_count,
    hasUpdates30d: r.has_updates_30d,
    lastChangedAt: r.last_changed_at,
    sourceUrl: r.source_url,
    children: [],
  };
}

function assembleTree(rows: SectionRow[]): SectionNode[] {
  const nodes = rows.map(rowToNode);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: SectionNode[] = [];
  for (const n of nodes) {
    if (n.parentSectionId && byId.has(n.parentSectionId)) {
      byId.get(n.parentSectionId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  for (const n of nodes) {
    n.children.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
  }
  roots.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
  return roots;
}

const SECTION_COLUMNS =
  "id, regulator_id, jurisdiction_code, parent_section_id, level, level_label, identifier, title, citation, regulatory_item_id, path, child_count, has_updates_30d, last_changed_at, source_url";

/**
 * Load the full hierarchy tree for one jurisdiction. Returns the
 * top-level roots with children nested.
 *
 * PostgREST caps any single response at ~1,000 rows regardless of .limit(),
 * so we page through with .range() until a short page comes back. A full CFR
 * Title is ~6k nodes; the page cap (50k) is just a runaway guard.
 */
export async function getJurisdictionHierarchy(
  jurisdictionCode: string,
): Promise<SectionNode[]> {
  const svc = createServiceClient();
  const PAGE = 1000;
  const MAX = 60000;
  const rows: SectionRow[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await svc
      .from("regulatory_sections")
      .select(SECTION_COLUMNS)
      .eq("jurisdiction_code", jurisdictionCode)
      .order("level", { ascending: true })
      .order("identifier", { ascending: true })
      .order("path", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      if (rows.length === 0) return [];
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as SectionRow[]));
    if (data.length < PAGE) break;
  }
  return assembleTree(rows);
}

/**
 * List the publishers that have at least one section row, grouped by
 * jurisdiction. Used by the Discover landing to surface the cards.
 */
export async function listHierarchyPublishers(): Promise<
  { jurisdictionCode: string; regulatorId: string; rootCount: number; updates30d: number }[]
> {
  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("regulatory_sections")
    .select("jurisdiction_code, regulator_id, has_updates_30d, level");
  if (!rows) return [];
  const agg = new Map<
    string,
    { jurisdictionCode: string; regulatorId: string; rootCount: number; updates30d: number }
  >();
  for (const r of rows) {
    const key = `${r.jurisdiction_code}::${r.regulator_id}`;
    if (!agg.has(key)) {
      agg.set(key, {
        jurisdictionCode: r.jurisdiction_code as string,
        regulatorId: r.regulator_id as string,
        rootCount: 0,
        updates30d: 0,
      });
    }
    const entry = agg.get(key)!;
    if (r.level === 1) entry.rootCount += 1;
    if (r.has_updates_30d) entry.updates30d += 1;
  }
  return Array.from(agg.values());
}

/**
 * Counts the recent (30d) update markers across the entire tree for
 * a jurisdiction. Used for the page header strip.
 */
export async function countRecentJurisdictionUpdates(
  jurisdictionCode: string,
): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc
    .from("regulatory_sections")
    .select("id", { count: "exact", head: true })
    .eq("jurisdiction_code", jurisdictionCode)
    .eq("has_updates_30d", true);
  return count ?? 0;
}
