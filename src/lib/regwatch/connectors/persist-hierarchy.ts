import { createServiceClient } from "@/lib/regwatch/supabase/service";
import type { HierarchyNode, HierarchySyncResult } from "./types";

/**
 * Persists a publisher's hierarchy tree into regwatch.regulatory_sections.
 *
 * - Walks the tree DFS so a parent row exists before its children's
 *   parent_section_id resolution.
 * - Upserts on `path` (the unique key) — re-runs are idempotent.
 * - Stamps `last_seen_at` on every visited row; rows whose `last_seen_at`
 *   stays old are vanished-from-source candidates (kept around — soft
 *   delete only — so any document/obligation cross-references stay
 *   resolvable).
 * - Resolves leaf `citation` → `regulatory_item_id` in a single batch
 *   lookup at the end (one round-trip, regardless of tree size).
 *
 * Designed to be called from the regwatch-hierarchy cron, one connector
 * at a time. Large trees (eCFR Title 40 ≈ 12k nodes) finish in a few
 * seconds because every operation is batched.
 */
export async function persistHierarchy(
  regulatorSlug: string,
  jurisdictionCode: string,
  roots: HierarchyNode[],
): Promise<HierarchySyncResult> {
  const result: HierarchySyncResult = {
    source: regulatorSlug,
    upserted: 0,
    errors: [],
  };
  if (roots.length === 0) return result;

  const svc = createServiceClient();

  const { data: reg, error: regErr } = await svc
    .from("regulators")
    .select("id")
    .eq("slug", regulatorSlug)
    .maybeSingle();
  if (regErr || !reg) {
    result.errors.push(`regulator not found: ${regulatorSlug}`);
    return result;
  }
  const regulatorId = reg.id as string;

  // Flatten the tree into a level-ordered list so parents land before
  // children (each child's parent_section_id is resolved by path lookup
  // after its level finishes).
  type FlatNode = {
    node: HierarchyNode;
    parentPath: string | null;
    depth: number;
  };
  const flat: FlatNode[] = [];
  function walk(node: HierarchyNode, parentPath: string | null, depth: number) {
    flat.push({ node, parentPath, depth });
    for (const child of node.children) walk(child, node.path, depth + 1);
  }
  for (const root of roots) walk(root, null, 0);

  // Group by depth so we insert parents → children one stratum at a time.
  const byDepth = new Map<number, FlatNode[]>();
  let maxDepth = 0;
  for (const f of flat) {
    if (!byDepth.has(f.depth)) byDepth.set(f.depth, []);
    byDepth.get(f.depth)!.push(f);
    if (f.depth > maxDepth) maxDepth = f.depth;
  }

  const pathToId = new Map<string, string>();
  const now = new Date().toISOString();

  for (let depth = 0; depth <= maxDepth; depth++) {
    const slice = byDepth.get(depth);
    if (!slice || slice.length === 0) continue;

    const rows = slice.map((f) => ({
      regulator_id: regulatorId,
      jurisdiction_code: jurisdictionCode,
      parent_section_id: f.parentPath ? pathToId.get(f.parentPath) ?? null : null,
      level: f.node.level,
      level_label: f.node.level_label,
      identifier: f.node.identifier,
      title: f.node.title,
      citation: f.node.citation,
      path: f.node.path,
      child_count: f.node.children.length,
      source_url: f.node.source_url,
      last_seen_at: now,
    }));

    // Upsert in chunks of 200; Supabase REST request size ceiling.
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { data: upserted, error } = await svc
        .from("regulatory_sections")
        .upsert(chunk, { onConflict: "path" })
        .select("id, path");
      if (error) {
        result.errors.push(`depth ${depth} upsert: ${error.message}`);
        continue;
      }
      for (const u of upserted ?? []) {
        pathToId.set(u.path as string, u.id as string);
      }
      result.upserted += upserted?.length ?? 0;
    }
  }

  // Resolve citations on leaf rows → regulatory_item_id (one batch).
  const leavesWithCitation = flat.filter((f) => f.node.citation);
  if (leavesWithCitation.length > 0) {
    const citations = Array.from(
      new Set(leavesWithCitation.map((f) => f.node.citation as string)),
    );
    const { data: items, error: itemErr } = await svc
      .from("regulatory_items")
      .select("id, citation")
      .eq("regulator_id", regulatorId)
      .in("citation", citations);
    if (itemErr) {
      result.errors.push(`citation lookup: ${itemErr.message}`);
    } else {
      const citationToItemId = new Map(
        (items ?? []).map((it) => [it.citation as string, it.id as string]),
      );
      const updates: { id: string; regulatory_item_id: string }[] = [];
      for (const f of leavesWithCitation) {
        const sectionId = pathToId.get(f.node.path);
        const itemId = citationToItemId.get(f.node.citation as string);
        if (sectionId && itemId) {
          updates.push({ id: sectionId, regulatory_item_id: itemId });
        }
      }
      for (let i = 0; i < updates.length; i += 200) {
        const chunk = updates.slice(i, i + 200);
        for (const u of chunk) {
          await svc
            .from("regulatory_sections")
            .update({ regulatory_item_id: u.regulatory_item_id })
            .eq("id", u.id);
        }
      }
    }
  }

  // Refresh has_updates_30d + last_changed_at via the SQL helper.
  const { error: refreshErr } = await svc.rpc(
    "refresh_regulatory_section_recency",
  );
  if (refreshErr) {
    result.errors.push(`recency refresh: ${refreshErr.message}`);
  }

  return result;
}
