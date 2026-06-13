import { createClient } from "./supabase/server";
import { listFolders, type DocumentFolder } from "./document-folders";
import { isIntelleEmbedEnabled } from "@/lib/llm/config";
import { embedOneCustomer, toPgVectorLiteral } from "@/lib/llm/embeddings";

/**
 * Full-text search over the caller's org internal documents ("Company Docs"
 * source on the Search page). Backed by the search_internal_documents RPC
 * (SECURITY INVOKER → RLS scopes to the caller's org). Folder scoping expands
 * each selected folder to include its descendants so ticking a parent searches
 * everything nested under it.
 */

export interface CompanyDocResult {
  id: string;
  title: string;
  docKind: string;
  internalCode: string | null;
  version: string | null;
  status: string;
  folderId: string | null;
  folderName: string | null;
  updatedAt: string;
  /** ts_headline fragment (may contain <b> highlight tags). */
  snippet: string | null;
  rank: number;
}

/** Expand selected folder ids to include all descendants (parent → subtree). */
function expandDescendants(selected: string[], folders: DocumentFolder[]): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parentId) continue;
    const arr = childrenByParent.get(f.parentId) ?? [];
    arr.push(f.id);
    childrenByParent.set(f.parentId, arr);
  }
  const out = new Set<string>();
  const stack = [...selected];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const c of childrenByParent.get(id) ?? []) stack.push(c);
  }
  return [...out];
}

export async function searchInternalDocuments(
  query: string,
  opts: { folderIds?: string[]; includeUnfiled?: boolean } = {},
): Promise<CompanyDocResult[]> {
  if (!query || query.trim().length === 0) return [];
  const supabase = await createClient();

  // Folders are needed both to expand descendants and to label results.
  const folders = await listFolders();
  const expanded = opts.folderIds?.length
    ? expandDescendants(opts.folderIds, folders)
    : [];
  const folderName = new Map(folders.map((f) => [f.id, f.name]));

  const { data, error } = await supabase.rpc("search_internal_documents", {
    query_text: query,
    folder_ids: expanded.length ? expanded : null,
    include_unfiled: opts.includeUnfiled ?? false,
  });
  if (error) {
    // RPC not deployed yet, or transient error — degrade to no doc results so
    // the regulatory search still renders.
    console.error("[regwatch] searchInternalDocuments rpc error:", error);
    return [];
  }

  type Row = {
    id: string;
    title: string;
    doc_kind: string;
    internal_code: string | null;
    version: string | null;
    status: string;
    folder_id: string | null;
    updated_at: string;
    snippet: string | null;
    rank: number;
  };
  return (data ?? []).map((r: Row) => ({
    id: r.id,
    title: r.title,
    docKind: r.doc_kind,
    internalCode: r.internal_code,
    version: r.version,
    status: r.status,
    folderId: r.folder_id,
    folderName: r.folder_id ? (folderName.get(r.folder_id) ?? null) : null,
    updatedAt: r.updated_at,
    snippet: r.snippet,
    rank: r.rank,
  }));
}

/**
 * Hybrid (self-hosted vector + FTS) company-doc search. When intelleLLM
 * isolation + the embedder are configured, embeds the query with the
 * self-hosted embedder and runs search_internal_documents_hybrid. Otherwise —
 * and on any embed/RPC error — falls back to the FTS-only searchInternalDocuments
 * so behavior is unchanged while isolation is off. Customer text is NEVER sent to
 * Voyage; query embedding only happens via the self-hosted embedder.
 */
export async function searchInternalDocumentsHybrid(
  query: string,
  opts: { folderIds?: string[]; includeUnfiled?: boolean } = {},
): Promise<CompanyDocResult[]> {
  if (!query || query.trim().length === 0) return [];
  if (!isIntelleEmbedEnabled()) {
    return searchInternalDocuments(query, opts);
  }

  let queryEmbeddingLiteral: string | null = null;
  try {
    const qvec = await embedOneCustomer(query);
    queryEmbeddingLiteral = toPgVectorLiteral(qvec);
  } catch (e) {
    console.error("[regwatch] internal-doc query embed failed:", e);
    return searchInternalDocuments(query, opts);
  }

  const supabase = await createClient();
  const folders = await listFolders();
  const expanded = opts.folderIds?.length
    ? expandDescendants(opts.folderIds, folders)
    : [];
  const folderName = new Map(folders.map((f) => [f.id, f.name]));

  const { data, error } = await supabase.rpc("search_internal_documents_hybrid", {
    query_embedding: queryEmbeddingLiteral,
    query_text: query,
    match_limit: 6,
    alpha: 0.6,
    folder_ids: expanded.length ? expanded : null,
    include_unfiled: opts.includeUnfiled ?? false,
  });
  if (error) {
    console.error("[regwatch] searchInternalDocumentsHybrid rpc error:", error);
    return searchInternalDocuments(query, opts);
  }

  type HybridRow = {
    id: string;
    title: string;
    doc_kind: string;
    internal_code: string | null;
    version: string | null;
    status: string;
    folder_id: string | null;
    updated_at: string;
    snippet: string | null;
    blended_score: number;
  };
  return (data ?? []).map((r: HybridRow) => ({
    id: r.id,
    title: r.title,
    docKind: r.doc_kind,
    internalCode: r.internal_code,
    version: r.version,
    status: r.status,
    folderId: r.folder_id,
    folderName: r.folder_id ? (folderName.get(r.folder_id) ?? null) : null,
    updatedAt: r.updated_at,
    snippet: r.snippet,
    rank: r.blended_score,
  }));
}
