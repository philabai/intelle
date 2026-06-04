"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Severity } from "@/lib/regwatch/match";

const SORTS = [
  { value: "score", label: "Footprint relevance" },
  { value: "newest", label: "Newest match" },
  { value: "deadline", label: "Approaching deadline" },
  { value: "recently_changed", label: "Recently changed" },
];

const SEVERITIES: { value: Severity | ""; label: string }[] = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical only" },
  { value: "high", label: "High +" },
  { value: "normal", label: "Normal +" },
];

interface Props {
  counts: {
    critical: number;
    high: number;
    normal: number;
    low: number;
    resolved: number;
    total: number;
  };
}

export function FeedFilters({ counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const sort = params.get("sort") ?? "score";
  const severity = params.get("severity") ?? "";
  const showResolved = params.get("show_resolved") === "1";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-card-bg/40 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Pill label="Critical" count={counts.critical} active={severity === "critical"} onClick={() => update("severity", severity === "critical" ? "" : "critical")} tone="critical" />
        <Pill label="High" count={counts.high} active={severity === "high"} onClick={() => update("severity", severity === "high" ? "" : "high")} tone="high" />
        <Pill label="Normal" count={counts.normal} active={severity === "normal"} onClick={() => update("severity", severity === "normal" ? "" : "normal")} tone="normal" />
        <Pill label="Resolved" count={counts.resolved} active={showResolved} onClick={() => update("show_resolved", showResolved ? "" : "1")} tone="muted" />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          <span>Sort:</span>
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <span>Severity:</span>
          <select
            value={severity}
            onChange={(e) => update("severity", e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone: "critical" | "high" | "normal" | "muted";
}) {
  const toneStyles =
    tone === "critical"
      ? "text-red-300 border-red-500/40"
      : tone === "high"
        ? "text-amber-300 border-amber-400/40"
        : tone === "normal"
          ? "text-brand-teal border-brand-teal/40"
          : "text-muted border-card-border";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${toneStyles} ${
        active ? "bg-foreground/10" : "bg-transparent hover:bg-foreground/5"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] text-muted">{count}</span>
    </button>
  );
}
