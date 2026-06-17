"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { rescorePost, savePostQualityOverride, regeneratePost } from "@/lib/outreach/actions";
import type { QualityReview } from "@/lib/outreach/generate";

interface Defaults { qualityTarget: number; qualityCheckPrompt: string; composePrompt: string }

function Bar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-brand-teal" : pct >= 60 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function QualityPanel({ postId, initialReview, defaults, hasOverride }: {
  postId: string; initialReview: QualityReview | null; defaults: Defaults; hasOverride: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [review, setReview] = useState<QualityReview | null>(initialReview);
  const [open, setOpen] = useState(false);

  const [qualityTarget, setQualityTarget] = useState(defaults.qualityTarget);
  const [qcPrompt, setQcPrompt] = useState(defaults.qualityCheckPrompt);
  const [composePrompt, setComposePrompt] = useState(defaults.composePrompt);

  const override = () => ({ qualityTarget, qualityCheckPrompt: qcPrompt, composePrompt });

  function rescore() {
    setMsg(null);
    startTransition(async () => {
      const r = await rescorePost({ postId });
      if (!r.ok) setMsg(r.error);
      else { setReview(r.review); router.refresh(); }
    });
  }
  function saveOverride() {
    setMsg(null);
    startTransition(async () => {
      const r = await savePostQualityOverride({ postId, override: override() });
      setMsg(r.ok ? "Saved for this article. It won’t affect other articles." : r.error);
    });
  }
  function regenWith() {
    setMsg(null);
    startTransition(async () => {
      const r = await regeneratePost({ postId, override: override() });
      if (!r.ok) setMsg(r.error);
      else if (r.postId) router.push(`/outreach/posts/${r.postId}`);
    });
  }

  const conf = review ? Math.round(review.confidence * 100) : null;
  const barPct = Math.round(qualityTarget * 100);

  return (
    <div className="mt-4 rounded-lg border border-card-border bg-card-bg p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Quality score</p>
        <div className="flex items-center gap-3">
          {conf != null && (
            <span className={`text-sm font-semibold ${conf >= barPct ? "text-brand-teal" : "text-amber-400"}`}>
              {conf}% {conf < barPct && <span className="text-xs font-normal text-amber-400">· below {barPct}% bar</span>}
            </span>
          )}
          <button onClick={rescore} disabled={pending}
            className="rounded border border-card-border px-2.5 py-1 text-xs text-foreground hover:border-brand-blue disabled:opacity-50">
            {pending ? "…" : "Re-score"}
          </button>
        </div>
      </div>

      {/* Per-criterion breakdown */}
      {review && review.breakdown.length > 0 ? (
        <div className="mt-3 space-y-2">
          {review.breakdown.map((b, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">{b.criterion}</span>
                <span className="text-muted">{Math.round(b.score * 100)}%</span>
              </div>
              <Bar score={b.score} />
              {b.note && <p className="mt-0.5 text-[11px] text-muted">{b.note}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">No per-criterion breakdown yet — click <span className="text-white">Re-score</span> to grade this draft against the current rubric.</p>
      )}

      {/* Issues */}
      {review && review.issues.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-card-border pt-3">
          {review.issues.map((it, i) => (
            <li key={i} className="text-xs">
              <span className={`mr-1.5 rounded px-1 py-0.5 text-[10px] uppercase ${it.severity === "blocker" ? "bg-red-500/15 text-red-300" : "bg-amber-400/15 text-amber-400"}`}>{it.severity}</span>
              <span className="text-muted">{it.note}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Per-article override */}
      <div className="mt-4 border-t border-card-border pt-3">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
          <span className="text-sm font-medium text-white">Customize quality for this article {hasOverride && <span className="text-xs text-brand-violet">· override active</span>}</span>
          <span className="text-xs text-muted">{open ? "hide" : "edit"}</span>
        </button>
        {open && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted">These settings apply only to <span className="text-white">this</span> article when you regenerate it — the global Quality &amp; Prompts defaults are unchanged.</p>
            <div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted">Pass bar for this article</span><span className="text-white">{barPct}%</span></div>
              <input type="range" min={50} max={99} value={barPct} onChange={(e) => setQualityTarget(Number(e.target.value) / 100)} className="w-full accent-brand-blue" />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Quality-check rubric (this article)</span>
              <textarea value={qcPrompt} onChange={(e) => setQcPrompt(e.target.value)} rows={10}
                className="w-full rounded border border-card-border bg-background px-2 py-1 font-mono text-[11px] text-foreground" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Compose prompt (this article)</span>
              <textarea value={composePrompt} onChange={(e) => setComposePrompt(e.target.value)} rows={10}
                className="w-full rounded border border-card-border bg-background px-2 py-1 font-mono text-[11px] text-foreground" />
            </label>
            <div className="flex gap-2">
              <button onClick={regenWith} disabled={pending}
                className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50">
                {pending ? "Working…" : "Regenerate with these settings"}
              </button>
              <button onClick={saveOverride} disabled={pending}
                className="rounded-md border border-card-border px-3 py-1.5 text-sm text-foreground hover:border-brand-blue disabled:opacity-50">
                Save override (no regen)
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
