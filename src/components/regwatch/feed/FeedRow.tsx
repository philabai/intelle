"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import type { FeedItem } from "@/lib/regwatch/feed-queries";
import { markSeen, markResolved, undoResolved } from "@/lib/regwatch/feed-actions";
import { generateBriefing } from "@/lib/regwatch/briefing-actions";
import { FootprintScoreChip } from "./FootprintScoreChip";
import { AssigneeSelect } from "./AssigneeSelect";
import { StatusChip } from "@/components/regwatch/StatusChip";
import { InstrumentTypeBadge } from "@/components/regwatch/InstrumentTypeBadge";
import { topicLabel } from "@/lib/regwatch/taxonomy";

interface AssigneeOption {
  userId: string;
  displayName: string;
}

interface Props {
  feedItem: FeedItem;
  assigneeOptions?: AssigneeOption[];
}

export function FeedRow({ feedItem: f, assigneeOptions = [] }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [seenAt, setSeenAt] = useState(f.seen_at);
  const [resolvedAt, setResolvedAt] = useState(f.resolved_at);
  const [briefingPending, setBriefingPending] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const href = `/regwatch/r/${f.item.jurisdiction_code.toLowerCase()}/${f.item.slug}`;
  const changedAgo = formatDistanceToNowStrict(new Date(f.item.last_changed_at), {
    addSuffix: false,
  });
  const isUnseen = !seenAt && !resolvedAt;

  const deadline = f.item.consultation_closes_at ?? f.item.effective_date;
  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  const deadlineKind = f.item.consultation_closes_at ? "consultation" : "effective";

  // Build the "why" line from the match_reason payload.
  const why: string[] = [];
  const r = f.match_reason;
  if (r) {
    if (r.geo.matched && r.geo.via) why.push(`Geography: ${r.geo.via}`);
    if (r.regulator.matched && r.regulator.via)
      why.push(`Followed regulator: ${r.regulator.via}`);
    if (r.topic.matched.length > 0)
      why.push(`Topics: ${r.topic.matched.map(topicLabel).join(", ")}`);
    if (r.naics.matched.length > 0)
      why.push(`NAICS: ${r.naics.matched.join(", ")}`);
    if (r.substance.matched.length > 0)
      why.push(`Substances: ${r.substance.matched.join(", ")}`);
  }

  function expandAndMarkSeen() {
    setExpanded((v) => !v);
    if (!seenAt && !resolvedAt) {
      const now = new Date().toISOString();
      setSeenAt(now);
      startTransition(() => {
        markSeen({ matchId: f.match_id }).catch(() => setSeenAt(null));
      });
    }
  }

  function onResolve() {
    const now = new Date().toISOString();
    setResolvedAt(now);
    startTransition(() => {
      markResolved({ matchId: f.match_id }).catch(() => setResolvedAt(null));
    });
  }
  function onUndo() {
    setResolvedAt(null);
    startTransition(() => {
      undoResolved({ matchId: f.match_id }).catch(() =>
        setResolvedAt(new Date().toISOString()),
      );
    });
  }

  async function onGenerateBriefing(e: React.MouseEvent) {
    e.stopPropagation();
    if (briefingPending) return;
    setBriefingError(null);
    setBriefingPending(true);
    try {
      const res = await generateBriefing({ matchId: f.match_id });
      if (res.ok && res.briefingId) {
        router.push(`/regwatch/briefing/${res.briefingId}`);
      } else {
        setBriefingError(res.error ?? "Briefing failed");
        setBriefingPending(false);
      }
    } catch (err) {
      setBriefingError((err as Error).message);
      setBriefingPending(false);
    }
  }

  return (
    <div
      className={`border-b border-card-border transition-colors ${
        resolvedAt ? "opacity-60" : ""
      }`}
    >
      <div
        className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-card-bg/60 sm:px-6"
        onClick={expandAndMarkSeen}
      >
        <span
          aria-hidden
          className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
            isUnseen ? "bg-brand-teal" : "bg-transparent"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <FootprintScoreChip score={f.score} severity={f.severity} size="sm" />
            <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider">
              {f.item.jurisdiction_code}
            </span>
            <span className="font-medium text-foreground/80">
              {f.item.regulator.short_name ?? f.item.regulator.name}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono">{f.item.citation}</span>
            <InstrumentTypeBadge value={f.item.instrument_type} />
            <StatusChip status={f.item.status} />
          </div>
          <h3 className="mt-1.5 text-sm font-medium text-foreground">
            {f.item.title}
          </h3>
          {f.item.summary && !expanded && (
            <p className="mt-1 line-clamp-1 text-xs text-muted">{f.item.summary}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right text-[11px] text-muted">
          <span>{changedAgo} ago</span>
          {deadlineLabel && (
            <span className="text-foreground/80">
              {deadlineKind === "consultation" ? "closes" : "eff."} {deadlineLabel}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-card-border bg-background/40 px-4 pb-4 pt-3 sm:px-6">
          {f.item.summary && (
            <p className="text-sm text-foreground/90">{f.item.summary}</p>
          )}
          {why.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                Why this matches your footprint
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {why.map((w, idx) => (
                  <li key={idx}>· {w}</li>
                ))}
              </ul>
            </div>
          )}
          {assigneeOptions.length > 0 && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <AssigneeSelect
                matchId={f.match_id}
                options={assigneeOptions}
                initialAssigneeId={f.assigned_to}
              />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={href}
              className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-teal"
            >
              Open regulation →
            </Link>
            {resolvedAt ? (
              <button
                type="button"
                onClick={onUndo}
                className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Un-resolve
              </button>
            ) : (
              <button
                type="button"
                onClick={onResolve}
                className="rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-1.5 text-xs text-brand-teal hover:bg-brand-teal/20"
              >
                Mark resolved
              </button>
            )}
            <button
              type="button"
              onClick={onGenerateBriefing}
              disabled={briefingPending}
              aria-busy={briefingPending}
              className="inline-flex items-center gap-2 rounded-md border border-brand-violet/40 bg-brand-violet/10 px-3 py-1.5 text-xs text-brand-violet hover:bg-brand-violet/20 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {briefingPending && (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="9" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" />
                </svg>
              )}
              {briefingPending
                ? "Generating impact briefing… (~10–20s)"
                : "Generate impact briefing"}
            </button>
          </div>
          {briefingPending && (
            <p className="mt-2 text-[11px] text-muted">
              Claude Opus is reading the regulation + your footprint to write a
              4-section briefing. Don&apos;t close this row until it lands.
            </p>
          )}
          {briefingError && (
            <p className="mt-2 text-xs text-red-400">{briefingError}</p>
          )}
        </div>
      )}
    </div>
  );
}
