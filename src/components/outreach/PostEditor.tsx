"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { approvePost, rejectPost, regeneratePost, savePostEdits } from "@/lib/outreach/actions";
import type { OutreachPost } from "@/lib/outreach/types";

function Field({ label, value, onChange, rows = 3, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-muted/70">{hint}</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
      />
    </label>
  );
}

export function PostEditor({ post }: { post: OutreachPost }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(post.title ?? "");
  const [long, setLong] = useState(post.body_long ?? "");
  const [medium, setMedium] = useState(post.body_medium ?? "");
  const [short, setShort] = useState(post.body_short ?? "");
  const [thread, setThread] = useState((post.body_thread ?? []).join("\n---\n"));
  const [hashtags, setHashtags] = useState((post.hashtags ?? []).join(" "));
  const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [rejectReason, setRejectReason] = useState("");
  const [guidance, setGuidance] = useState("");

  const readOnly = !["draft", "pending_review", "under_review"].includes(post.status);
  const threadArr = thread.split("\n---\n").map((t) => t.trim()).filter(Boolean);
  const hashArr = hashtags.split(/\s+/).map((h) => h.replace(/^#/, "")).filter(Boolean);

  function run(fn: () => Promise<{ ok: boolean; error?: string; postId?: string }>, after?: (r: { postId?: string }) => void) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Action failed");
      else { setMsg("Saved."); after?.(r); router.refresh(); }
    });
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Editor */}
      <div className="space-y-4">
        <Field label="Title" value={title} onChange={setTitle} rows={1} />
        <Field label="Long-form (article / newsletter)" value={long} onChange={setLong} rows={10} />
        <Field label="LinkedIn post" value={medium} onChange={setMedium} rows={6} hint={`${medium.length} chars`} />
        <Field label="X post" value={short} onChange={setShort} rows={3} hint={`${short.length}/270`} />
        <Field label="X thread (separate posts with a line of ---)" value={thread} onChange={setThread} rows={6} />
        <Field label="Hashtags (space-separated)" value={hashtags} onChange={setHashtags} rows={1} />

        {post.citations?.length > 0 && (
          <div className="rounded-lg border border-card-border bg-card-bg/40 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Citations</p>
            <ol className="space-y-1 text-xs text-muted">
              {post.citations.map((c) => (
                <li key={c.n}>[{c.n}] {c.label}{c.url ? ` — ${c.url}` : ""}</li>
              ))}
            </ol>
          </div>
        )}

        {!readOnly && (
          <button
            disabled={pending}
            onClick={() => run(() => savePostEdits({ postId: post.id, title, body_long: long, body_medium: medium, body_short: short, body_thread: threadArr, hashtags: hashArr }))}
            className="rounded-md border border-card-border px-4 py-2 text-sm text-foreground hover:border-brand-blue disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save edits"}
          </button>
        )}
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </div>

      {/* Previews + actions */}
      <div className="space-y-4">
        <Preview platform="LinkedIn" body={medium} hashtags={hashArr} />
        <Preview platform="X" body={short} hashtags={hashArr} />
        {threadArr.length > 0 && (
          <div className="rounded-lg border border-card-border bg-card-bg p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">X thread ({threadArr.length})</p>
            <ol className="space-y-2">
              {threadArr.map((t, i) => (
                <li key={i} className="rounded bg-background p-2 text-xs text-foreground">{i + 1}. {t}</li>
              ))}
            </ol>
          </div>
        )}

        {!readOnly && (
          <div className="space-y-3 rounded-lg border border-card-border bg-card-bg p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Actions</p>
            <label className="block text-xs text-muted">
              Schedule for
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                className="mt-1 w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
            </label>
            <div className="flex gap-2">
              <button disabled={pending}
                onClick={() => run(() => approvePost({ postId: post.id, scheduledFor: new Date(when).toISOString() }), () => router.push("/outreach/queue"))}
                className="flex-1 rounded-md bg-brand-teal/90 px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal disabled:opacity-50">
                Approve &amp; schedule
              </button>
              <button disabled={pending}
                onClick={() => run(() => approvePost({ postId: post.id, scheduledFor: new Date().toISOString() }), () => router.push("/outreach/queue"))}
                className="rounded-md border border-card-border px-3 py-2 text-sm text-foreground hover:border-brand-teal disabled:opacity-50">
                Publish now
              </button>
            </div>

            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} placeholder="Rejection reason"
              className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
            <button disabled={pending || !rejectReason.trim()}
              onClick={() => run(() => rejectPost({ postId: post.id, reason: rejectReason }), () => router.push("/outreach/queue"))}
              className="w-full rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:border-red-400 disabled:opacity-40">
              Reject
            </button>

            <textarea value={guidance} onChange={(e) => setGuidance(e.target.value)} rows={2} placeholder="Optional guidance for regeneration"
              className="w-full rounded border border-card-border bg-background px-2 py-1 text-sm text-foreground" />
            <button disabled={pending}
              onClick={() => run(() => regeneratePost({ postId: post.id, guidance: guidance || undefined }), (r) => r.postId && router.push(`/outreach/posts/${r.postId}`))}
              className="w-full rounded-md border border-card-border px-3 py-2 text-sm text-foreground hover:border-brand-violet disabled:opacity-50">
              {pending ? "Working…" : "Regenerate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Preview({ platform, body, hashtags }: { platform: string; body: string; hashtags: string[] }) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{platform} preview</p>
      <div className="rounded bg-background p-3 text-sm text-foreground whitespace-pre-wrap">{body || "—"}</div>
      {hashtags.length > 0 && (
        <p className="mt-2 text-xs text-brand-blue">{hashtags.map((h) => `#${h}`).join(" ")}</p>
      )}
    </div>
  );
}
