import { createServiceClient } from "./supabase/service";

/**
 * Read-side helpers for the comments drawer + audit export.
 *
 * Comments are anchored to a doc, optionally to a revision and to a
 * free-form anchor blob (paragraph index, PM range, heading text — the
 * client decides the shape because it differs between editor-native and
 * upload-type docs). v1 ships top-level threads with replies; comment
 * bodies are immutable once posted (no edit-history table). Resolution
 * is mutable: `resolved_at` + `resolved_by` flip when an org member
 * marks a thread done.
 */

export interface CommentNode {
  id: string;
  parentCommentId: string | null;
  authorUserId: string | null;
  authorDisplayName: string;
  body: string;
  anchor: {
    quote?: string;
    paragraphAnchor?: string;
  } | null;
  resolvedAt: string | null;
  resolvedByDisplayName: string | null;
  createdAt: string;
}

export interface CommentThread {
  root: CommentNode;
  replies: CommentNode[];
}

export async function listCommentsForDoc(
  docId: string,
): Promise<CommentThread[]> {
  const svc = createServiceClient();

  const { data: rows } = await svc
    .from("internal_document_comments")
    .select(
      "id, parent_comment_id, author_user_id, body, anchor, resolved_at, resolved_by, created_at",
    )
    .eq("internal_document_id", docId)
    .order("created_at", { ascending: true });
  if (!rows || rows.length === 0) return [];

  const userIds = new Set<string>();
  for (const r of rows) {
    if (r.author_user_id) userIds.add(r.author_user_id as string);
    if (r.resolved_by) userIds.add(r.resolved_by as string);
  }
  const nameOf = new Map<string, string>();
  for (const id of userIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(id);
      if (u.user) {
        nameOf.set(
          id,
          (u.user.user_metadata?.full_name as string | undefined) ??
            u.user.email ??
            id,
        );
      }
    } catch {
      // best-effort; fall through to id-as-name
    }
  }

  const nodes: CommentNode[] = rows.map((r) => ({
    id: r.id as string,
    parentCommentId: (r.parent_comment_id as string | null) ?? null,
    authorUserId: (r.author_user_id as string | null) ?? null,
    authorDisplayName: r.author_user_id
      ? (nameOf.get(r.author_user_id as string) ?? (r.author_user_id as string))
      : "Unknown",
    body: r.body as string,
    anchor: (r.anchor as CommentNode["anchor"]) ?? null,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    resolvedByDisplayName: r.resolved_by
      ? (nameOf.get(r.resolved_by as string) ?? null)
      : null,
    createdAt: r.created_at as string,
  }));

  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const roots: CommentNode[] = [];
  const repliesByRoot = new Map<string, CommentNode[]>();
  for (const n of nodes) {
    if (!n.parentCommentId) {
      roots.push(n);
      repliesByRoot.set(n.id, []);
    }
  }
  for (const n of nodes) {
    if (n.parentCommentId) {
      // Walk up to find the root (handles 1-level replies in v1; deeper
      // nesting still bucketed under the topmost root).
      let cursor: CommentNode | undefined = byId.get(n.parentCommentId);
      while (cursor?.parentCommentId) cursor = byId.get(cursor.parentCommentId);
      if (cursor) {
        const list = repliesByRoot.get(cursor.id);
        if (list) list.push(n);
      }
    }
  }

  return roots
    .sort((a, b) => {
      // Open threads bubble to the top; within each group, newest first
      // so reviewers see recent activity without scrolling.
      if (!!a.resolvedAt !== !!b.resolvedAt) return a.resolvedAt ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((root) => ({
      root,
      replies: (repliesByRoot.get(root.id) ?? []).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
    }));
}

export async function countOpenComments(docId: string): Promise<number> {
  const svc = createServiceClient();
  const { count } = await svc
    .from("internal_document_comments")
    .select("id", { count: "exact", head: true })
    .eq("internal_document_id", docId)
    .is("resolved_at", null);
  return count ?? 0;
}
