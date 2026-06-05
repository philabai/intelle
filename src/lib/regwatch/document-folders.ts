import { createClient } from "./supabase/server";

/**
 * Project folders for internal documents. Self-referential tree, members
 * read, admins mutate. Pairs with `internal_documents.folder_id`.
 */

export interface DocumentFolder {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  slug: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface DocumentFolderTreeNode extends DocumentFolder {
  children: DocumentFolderTreeNode[];
  /** Including nested folders. */
  totalDocumentCount: number;
}

type Row = {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function mapRow(row: Row, docCount: number): DocumentFolder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    documentCount: docCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

/**
 * Returns every active folder for the caller's org, with a per-folder
 * document count attached. Archived folders are omitted.
 */
export async function listFolders(): Promise<DocumentFolder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("internal_document_folders")
    .select(
      "id, organization_id, parent_id, name, description, slug, created_at, updated_at, archived_at",
    )
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error || !data) {
    if (error) console.error("[regwatch] listFolders:", error);
    return [];
  }

  // Document counts in one round-trip.
  const folderIds = data.map((r) => r.id as string);
  const countByFolder = new Map<string, number>();
  if (folderIds.length > 0) {
    const { data: docs } = await supabase
      .from("internal_documents")
      .select("folder_id")
      .in("folder_id", folderIds);
    for (const d of docs ?? []) {
      const fid = d.folder_id as string | null;
      if (fid) countByFolder.set(fid, (countByFolder.get(fid) ?? 0) + 1);
    }
  }

  return data.map((r) =>
    mapRow(r as unknown as Row, countByFolder.get(r.id as string) ?? 0),
  );
}

/**
 * Walks up from a starting folder via parent_id, returning the chain in
 * root → leaf order (excluding the leaf itself). Used for breadcrumbs.
 * Capped at 10 hops as a tree-depth guard.
 */
export async function getFolderBreadcrumb(
  folderId: string,
): Promise<DocumentFolder[]> {
  const supabase = await createClient();
  const chain: DocumentFolder[] = [];
  let cursor: string | null = folderId;
  let hops = 0;
  while (cursor && hops < 10) {
    const { data } = await supabase
      .from("internal_document_folders")
      .select(
        "id, organization_id, parent_id, name, description, slug, created_at, updated_at, archived_at",
      )
      .eq("id", cursor)
      .maybeSingle();
    if (!data) break;
    const node = mapRow(data as unknown as Row, 0);
    if (node.id !== folderId) chain.unshift(node);
    cursor = node.parentId;
    hops += 1;
  }
  return chain;
}

export async function getFolder(id: string): Promise<DocumentFolder | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("internal_document_folders")
    .select(
      "id, organization_id, parent_id, name, description, slug, created_at, updated_at, archived_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // Count its direct documents.
  const { count } = await supabase
    .from("internal_documents")
    .select("id", { count: "exact", head: true })
    .eq("folder_id", id);
  return mapRow(data as unknown as Row, count ?? 0);
}

/** Build a forest of folder trees with cumulative document counts. */
export function buildFolderTree(
  flat: DocumentFolder[],
): DocumentFolderTreeNode[] {
  const byId = new Map<string, DocumentFolderTreeNode>();
  for (const f of flat)
    byId.set(f.id, { ...f, children: [], totalDocumentCount: f.documentCount });
  const roots: DocumentFolderTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Rollup totals.
  const rollup = (n: DocumentFolderTreeNode): number => {
    let sum = n.documentCount;
    for (const c of n.children) sum += rollup(c);
    n.totalDocumentCount = sum;
    return sum;
  };
  roots.forEach(rollup);
  const sort = (n: DocumentFolderTreeNode) => {
    n.children.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    n.children.forEach(sort);
  };
  roots.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  roots.forEach(sort);
  return roots;
}

/**
 * Count of documents whose folder_id is NULL (the "Unfiled" pseudo-folder
 * the UI surfaces alongside real folders).
 */
export async function countUnfiledDocuments(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("internal_documents")
    .select("id", { count: "exact", head: true })
    .is("folder_id", null);
  return count ?? 0;
}
