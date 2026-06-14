"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTransition } from "react";
import type { Severity } from "@/lib/regwatch/match";

const SORT_VALUES = ["score", "newest", "deadline", "recently_changed"] as const;

const SEVERITY_VALUES: { value: Severity | ""; key: string }[] = [
  { value: "", key: "sevAll" },
  { value: "critical", key: "sevCriticalOnly" },
  { value: "high", key: "sevHighPlus" },
  { value: "normal", key: "sevNormalPlus" },
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
  const t = useTranslations("regwatch.monitor");
  const router = useRouter();
  const pathname = usePathname();
  const sortLabels: Record<(typeof SORT_VALUES)[number], string> = {
    score: t("sortScore"),
    newest: t("sortNewest"),
    deadline: t("sortDeadline"),
    recently_changed: t("sortRecentlyChanged"),
  };
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const sort = params.get("sort") ?? "score";
  const severity = params.get("severity") ?? "";
  const showResolved = params.get("show_resolved") === "1";
  const assignedToMe = params.get("assigned_to_me") === "1";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-card-bg/40 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Pill label={t("pillCritical")} count={counts.critical} active={severity === "critical"} onClick={() => update("severity", severity === "critical" ? "" : "critical")} tone="critical" />
        <Pill label={t("pillHigh")} count={counts.high} active={severity === "high"} onClick={() => update("severity", severity === "high" ? "" : "high")} tone="high" />
        <Pill label={t("pillNormal")} count={counts.normal} active={severity === "normal"} onClick={() => update("severity", severity === "normal" ? "" : "normal")} tone="normal" />
        <Pill label={t("pillResolved")} count={counts.resolved} active={showResolved} onClick={() => update("show_resolved", showResolved ? "" : "1")} tone="muted" />
        <Pill label={t("pillAssignedToMe")} count={null} active={assignedToMe} onClick={() => update("assigned_to_me", assignedToMe ? "" : "1")} tone="normal" />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          <span>{t("sortLabel")}</span>
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {sortLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <span>{t("severityLabel")}</span>
          <select
            value={severity}
            onChange={(e) => update("severity", e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
          >
            {SEVERITY_VALUES.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.key)}
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
  count: number | null;
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
      {count !== null && (
        <span className="font-mono text-[10px] text-muted">{count}</span>
      )}
    </button>
  );
}
