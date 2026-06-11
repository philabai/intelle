import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

/**
 * Asset hierarchy read-side. Mutations live in assets-actions.ts so they're
 * server-action-importable. All reads go through the SSR client so RLS scopes
 * to the calling user's org automatically.
 */

export type AssetLevel = 2 | 3 | 4 | 5 | 6;

export interface AssetNode {
  id: string;
  organizationId: string;
  parentId: string | null;
  level: AssetLevel;
  name: string;
  code: string | null;
  assetType: string | null;
  jurisdictionCode: string | null;
  substancesCas: string[];
  tags: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTreeNode extends AssetNode {
  children: AssetTreeNode[];
}

export interface HierarchyConfig {
  id: string;
  organizationId: string;
  level2Label: string;
  level3Label: string;
  level4Label: string;
  level5Label: string;
  level6Enabled: boolean;
  level6Label: string | null;
  starterPack: string | null;
}

const DEFAULT_CONFIG_LABELS = {
  level2Label: "Site",
  level3Label: "Area",
  level4Label: "Asset Class",
  level5Label: "Asset",
  level6Label: "Component",
} as const;

function mapRow(row: Record<string, unknown>): AssetNode {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    level: row.level as AssetLevel,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    assetType: (row.asset_type as string | null) ?? null,
    jurisdictionCode: (row.jurisdiction_code as string | null) ?? null,
    substancesCas: (row.substances_cas as string[] | null) ?? [],
    tags: (row.tags as string[] | null) ?? [],
    archivedAt: (row.archived_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export interface AssetSearchResult {
  id: string;
  name: string;
  code: string | null;
  level: AssetLevel;
  assetType: string | null;
}

/** Default per-level labels (org may customise these in HierarchyConfig). */
export const ASSET_LEVEL_LABELS: Record<number, string> = {
  2: "Site",
  3: "Area",
  4: "Asset class",
  5: "Asset",
  6: "Component",
};

/**
 * Name/code search over the caller's org assets ("Assets" source on the Search
 * page). RLS-scoped. Small per-org corpora, so a simple ILIKE is plenty — no
 * index / RPC needed.
 */
export async function searchAssets(
  query: string,
  limit = 15,
): Promise<AssetSearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  const supabase = await createClient();
  // Strip characters that would break the PostgREST `.or()` filter grammar.
  const safe = query.trim().replace(/[,()*%]/g, " ").trim();
  if (!safe) return [];
  const { data, error } = await supabase
    .from("assets")
    .select("id, name, code, level, asset_type")
    .is("archived_at", null)
    .or(`name.ilike.*${safe}*,code.ilike.*${safe}*`)
    .order("level", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[regwatch] searchAssets:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    code: (r.code as string | null) ?? null,
    level: r.level as AssetLevel,
    assetType: (r.asset_type as string | null) ?? null,
  }));
}

/**
 * Returns every asset in the caller's org as a flat list, oldest-first.
 * Archived assets are omitted by default — pass `includeArchived` to read
 * tombstones for an audit view.
 */
export async function listAssets(
  options: { includeArchived?: boolean } = {},
): Promise<AssetNode[]> {
  const supabase = await createClient();
  let q = supabase
    .from("assets")
    .select(
      "id, organization_id, parent_id, level, name, code, asset_type, jurisdiction_code, substances_cas, tags, archived_at, created_at, updated_at",
    )
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });
  if (!options.includeArchived) {
    q = q.is("archived_at", null);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[regwatch] listAssets:", error);
    return [];
  }
  return (data ?? []).map(mapRow);
}

/** Same as listAssets() but assembled into a forest of trees rooted at L2 nodes. */
export async function listAssetTree(): Promise<AssetTreeNode[]> {
  const flat = await listAssets();
  return buildTree(flat);
}

export function buildTree(flat: AssetNode[]): AssetTreeNode[] {
  const byId = new Map<string, AssetTreeNode>();
  for (const node of flat) byId.set(node.id, { ...node, children: [] });
  const roots: AssetTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Stable sort: by name, case-insensitive.
  const sortRec = (n: AssetTreeNode) => {
    n.children.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    n.children.forEach(sortRec);
  };
  roots.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  roots.forEach(sortRec);
  return roots;
}

export async function getAsset(id: string): Promise<AssetNode | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select(
      "id, organization_id, parent_id, level, name, code, asset_type, jurisdiction_code, substances_cas, tags, archived_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[regwatch] getAsset:", error);
    return null;
  }
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/**
 * Returns the hierarchy config for the caller's org, materialising defaults
 * if no row exists yet. We use the service client for the upsert-default
 * path so a non-admin first-time visitor still sees the page render with
 * the canonical labels.
 */
export async function getHierarchyConfig(
  organizationId: string,
): Promise<HierarchyConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("asset_hierarchy_config")
    .select(
      "id, organization_id, level_2_label, level_3_label, level_4_label, level_5_label, level_6_enabled, level_6_label, starter_pack",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (data) {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      level2Label: (data.level_2_label as string) ?? DEFAULT_CONFIG_LABELS.level2Label,
      level3Label: (data.level_3_label as string) ?? DEFAULT_CONFIG_LABELS.level3Label,
      level4Label: (data.level_4_label as string) ?? DEFAULT_CONFIG_LABELS.level4Label,
      level5Label: (data.level_5_label as string) ?? DEFAULT_CONFIG_LABELS.level5Label,
      level6Enabled: Boolean(data.level_6_enabled),
      level6Label: (data.level_6_label as string | null) ?? DEFAULT_CONFIG_LABELS.level6Label,
      starterPack: (data.starter_pack as string | null) ?? null,
    };
  }
  // No row yet: surface the defaults without creating a row (admin will do
  // that explicitly via updateHierarchyConfig).
  return {
    id: "",
    organizationId,
    ...DEFAULT_CONFIG_LABELS,
    level6Enabled: false,
    starterPack: null,
  };
}

/**
 * Walks up from a starting asset to the org root via parent_id, returning
 * the ancestor chain in root-to-leaf order. Used by the asset detail page
 * to compute inherited obligations + inherited documents.
 */
export async function getAssetAncestors(
  assetId: string,
): Promise<AssetNode[]> {
  const supabase = await createClient();
  const chain: AssetNode[] = [];
  let cursorId: string | null = assetId;
  let depth = 0;
  while (cursorId && depth < 10) {
    const { data }: { data: Record<string, unknown> | null } = await supabase
      .from("assets")
      .select(
        "id, organization_id, parent_id, level, name, code, asset_type, jurisdiction_code, substances_cas, tags, archived_at, created_at, updated_at",
      )
      .eq("id", cursorId)
      .maybeSingle();
    if (!data) break;
    const node = mapRow(data);
    if (node.id !== assetId) chain.unshift(node);
    cursorId = node.parentId;
    depth += 1;
  }
  return chain;
}

export async function getAssetChildren(assetId: string): Promise<AssetNode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select(
      "id, organization_id, parent_id, level, name, code, asset_type, jurisdiction_code, substances_cas, tags, archived_at, created_at, updated_at",
    )
    .eq("parent_id", assetId)
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

/**
 * Counts of assets per level + grand total for the org. Used by the page
 * header so admins see "0 sites · 0 assets" until they start configuring.
 */
export async function getAssetCounts(): Promise<{
  total: number;
  byLevel: Record<AssetLevel, number>;
}> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("assets")
    .select("level")
    .is("archived_at", null);
  const byLevel: Record<AssetLevel, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  if (error || !data) return { total: 0, byLevel };
  for (const row of data) {
    const lv = row.level as AssetLevel;
    byLevel[lv] = (byLevel[lv] ?? 0) + 1;
  }
  return { total: data.length, byLevel };
}
