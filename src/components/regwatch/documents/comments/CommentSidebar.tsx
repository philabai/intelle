"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  addComment,
  replyToComment,
  setCommentResolved,
} from "@/lib/regwatch/internal-document-comments-actions";
import type { CommentThread } from "@/lib/regwatch/internal-document-comments";

interface Props {
  docId: string;
  threads: CommentThread[];
  currentUserId: string;
  canResolve: boolean;
}

/**
 * Comment threads panel — drops into the DocSlideOver drawer. v1 supports
 * top-level threads, one-level replies, and resolve / re-open. Comment
 * bodies are immutable once posted; resolution is mutable via
 * setCommentResolved. Each insert + resolve drops an immutable audit
 * event for the audit-trail export.
 */
export function CommentSidebar({
  docId,
  threads,
  currentUserId,
  canResolve,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newBody, setNewBody] = useState("");
  const [newAnchor, setNewAnchor] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addComment({
        docId,
        body: newBody.trim(),
        anchor: newAnchor.trim()
          ? { paragraphAnchor: newAnchor.trim() }
          : undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not post comment");
        return;
      }
      setNewBody("");
      setNewAnchor("");
      router.refresh();
    });
  }

  function submitReply(parentId: string) {
    if (!replyBody.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await replyToComment({
        docId,
        parentCommentId: parentId,
        body: replyBody.trim(),
      });
      if (!res.ok) {
        setError(res.error ?? "Could not reply");
        return;
      }
      setReplyFor(null);
      setReplyBody("");
      router.refresh();
    });
  }

  function toggleResolve(commentId: string, resolved: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await setCommentResolved({
        docId,
        commentId,
        resolve: !resolved,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not update");
        return;
      }
      router.refresh();
    });
  }

  const open = threads.filter((t) => !t.root.resolvedAt);
  const resolved = threads.filter((t) => t.root.resolvedAt);

  return (
    <div className="space-y-4">
      <form
        onSubmit={submitNew}
        className="rounded-md border border-card-border bg-background/40 p-3"
      >
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
          New comment
        </p>
        <input
          type="text"
          value={newAnchor}
          onChange={(e) => setNewAnchor(e.target.value)}
          placeholder="Anchor (e.g. ¶4, §3.1, 'Title page')"
          className="mb-2 w-full rounded-md border border-card-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted focus:border-brand-blue focus:outline-none"
        />
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          rows={3}
          placeholder="Leave a review comment for the next reviewer…"
          className="mb-2 w-full rounded-md border border-card-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted focus:border-brand-blue focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted">
            Visible to everyone in your org. Immutable once posted.
          </p>
          <button
            type="submit"
            disabled={pending || !newBody.trim()}
            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
          {error}
        </p>
      )}

      {open.length === 0 && resolved.length === 0 && (
        <p className="rounded-md border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-[11px] text-muted">
          No comments yet. Be the first to leave one.
        </p>
      )}

      {open.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            Open · {open.length}
          </p>
          <ul className="space-y-2">
            {open.map((t) => (
              <CommentThreadCard
                key={t.root.id}
                thread={t}
                currentUserId={currentUserId}
                canResolve={canResolve}
                replyOpen={replyFor === t.root.id}
                replyBody={replyBody}
                pending={pending}
                onOpenReply={() => {
                  setReplyFor(t.root.id);
                  setReplyBody("");
                }}
                onCloseReply={() => setReplyFor(null)}
                onChangeReply={setReplyBody}
                onSubmitReply={() => submitReply(t.root.id)}
                onToggleResolve={toggleResolve}
              />
            ))}
          </ul>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            Resolved · {resolved.length}
          </p>
          <ul className="space-y-2 opacity-70">
            {resolved.map((t) => (
              <CommentThreadCard
                key={t.root.id}
                thread={t}
                currentUserId={currentUserId}
                canResolve={canResolve}
                replyOpen={false}
                replyBody=""
                pending={pending}
                onOpenReply={() => {}}
                onCloseReply={() => {}}
                onChangeReply={() => {}}
                onSubmitReply={() => {}}
                onToggleResolve={toggleResolve}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface CardProps {
  thread: CommentThread;
  currentUserId: string;
  canResolve: boolean;
  replyOpen: boolean;
  replyBody: string;
  pending: boolean;
  onOpenReply: () => void;
  onCloseReply: () => void;
  onChangeReply: (v: string) => void;
  onSubmitReply: () => void;
  onToggleResolve: (commentId: string, resolved: boolean) => void;
}

function CommentThreadCard({
  thread,
  currentUserId,
  canResolve,
  replyOpen,
  replyBody,
  pending,
  onOpenReply,
  onCloseReply,
  onChangeReply,
  onSubmitReply,
  onToggleResolve,
}: CardProps) {
  const isResolved = !!thread.root.resolvedAt;
  return (
    <li className="rounded-md border border-card-border bg-background/40 p-3">
      {thread.root.anchor?.paragraphAnchor && (
        <p className="mb-1 text-[10px] uppercase tracking-wider text-brand-teal">
          @ {thread.root.anchor.paragraphAnchor}
        </p>
      )}
      <CommentRow node={thread.root} />
      {thread.replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-s-2 border-card-border ps-3">
          {thread.replies.map((reply) => (
            <li key={reply.id}>
              <CommentRow node={reply} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-card-border pt-2">
        {!isResolved && !replyOpen && (
          <button
            type="button"
            onClick={onOpenReply}
            className="text-[11px] text-brand-blue hover:underline"
          >
            Reply
          </button>
        )}
        {isResolved && thread.root.resolvedByDisplayName && (
          <span className="text-[10px] text-muted">
            Resolved by {thread.root.resolvedByDisplayName}
          </span>
        )}
        {(canResolve || thread.root.authorUserId === currentUserId) && (
          <button
            type="button"
            onClick={() => onToggleResolve(thread.root.id, isResolved)}
            disabled={pending}
            className="ms-auto text-[10px] text-muted hover:text-foreground disabled:opacity-50"
          >
            {isResolved ? "Re-open" : "Resolve"}
          </button>
        )}
      </div>
      {replyOpen && (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={replyBody}
            onChange={(e) => onChangeReply(e.target.value)}
            rows={2}
            placeholder="Reply…"
            className="w-full rounded-md border border-card-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted focus:border-brand-blue focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCloseReply}
              className="text-[11px] text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmitReply}
              disabled={pending || !replyBody.trim()}
              className="rounded-md bg-brand-blue px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function CommentRow({
  node,
}: {
  node: CommentThread["root"] | CommentThread["replies"][number];
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {node.authorDisplayName}
        </p>
        <span
          className="text-[10px] text-muted"
          title={new Date(node.createdAt).toLocaleString()}
        >
          {formatDistanceToNowStrict(new Date(node.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-foreground/90">
        {node.body}
      </p>
    </div>
  );
}
