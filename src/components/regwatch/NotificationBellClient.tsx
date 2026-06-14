"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NotificationItem } from "@/lib/regwatch/alerts";
import type { Severity } from "@/lib/regwatch/match";
import { markAllNotificationsSeen } from "@/lib/regwatch/alerts-actions";

interface Props {
  initialCount: number;
  items: NotificationItem[];
}

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-400",
  high: "bg-amber-300",
  normal: "bg-brand-teal",
  low: "bg-muted",
};

export function NotificationBellClient({ initialCount, items }: Props) {
  const t = useTranslations("regwatch.common");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMarkAll() {
    setCount(0);
    startTransition(() => {
      markAllNotificationsSeen().catch(() => setCount(initialCount));
    });
  }

  const displayCount = count > 99 ? "99+" : count > 0 ? String(count) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label={t("bellAriaLabel", { count })}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-foreground hover:border-brand-teal"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {displayCount && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("notifications")}
          className="absolute end-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-card-border bg-background shadow-2xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-card-border bg-card-bg/60 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {t("notifications")}
              </p>
              <p className="text-sm font-medium text-foreground">
                {count === 0
                  ? t("allCaughtUp")
                  : t("unseenMatches", { count })}
              </p>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={onMarkAll}
                className="text-[11px] text-muted underline hover:text-foreground"
              >
                {t("markAllSeen")}
              </button>
            )}
          </header>

          <ul className="max-h-[420px] divide-y divide-card-border overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-muted">
                {t("noUnseenMatches")}
              </li>
            ) : (
              items.map((n) => {
                const href = `/regwatch/r/${n.jurisdictionCode.toLowerCase()}/${n.slug}`;
                const ago = format.relativeTime(new Date(n.matchedAt));
                return (
                  <li key={n.matchId}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-card-bg/60"
                    >
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
                        <span
                          aria-hidden
                          className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[n.severity]}`}
                        />
                        <span>{n.severity}</span>
                        <span aria-hidden>·</span>
                        <span className="font-mono">{n.score.toFixed(0)}</span>
                        <span aria-hidden>·</span>
                        <span>{n.jurisdictionCode}</span>
                        <span aria-hidden>·</span>
                        <span>{ago}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted">
                        {n.regulatorShortName ?? n.regulatorName} · {n.citation}
                      </p>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          <footer className="flex items-center justify-between border-t border-card-border bg-card-bg/40 px-4 py-2">
            <Link
              href="/regwatch/feed"
              onClick={() => setOpen(false)}
              className="text-xs text-brand-teal hover:underline"
            >
              {t("viewAllInFeed")}
            </Link>
            <Link
              href="/regwatch/settings/alerts"
              onClick={() => setOpen(false)}
              className="text-[11px] text-muted hover:text-foreground"
            >
              {t("preferences")}
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}
