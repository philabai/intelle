"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import {
  TOUR_CATALOGUE,
  tourForPathname,
  type TourEntry,
} from "./tours";
import { clearAllTourFlags } from "./GuidedTour";
import { TUTORIAL_COURSES } from "@/lib/regwatch/tutorials";

/** Short labels for the video-tour summary line, by course slug. */
const COURSE_SHORT_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  search: "Search",
  regulations: "Regulations",
  monitor: "Monitor",
  comply: "Comply",
  author: "Author",
};

// Only count courses that actually have rendered clips (skip "coming soon").
const WATCHABLE_COURSES = TUTORIAL_COURSES.filter((c) => c.sections.length > 0);
const VIDEO_TOUR_COUNT = WATCHABLE_COURSES.length;
const VIDEO_TOUR_SUMMARY = WATCHABLE_COURSES.map(
  (c) => COURSE_SHORT_LABEL[c.slug] ?? c.title,
).join(" · ");

const GuidedTour = dynamic(
  () => import("./GuidedTour").then((m) => m.GuidedTour),
  { ssr: false },
);

interface Props {
  open: boolean;
  onClose: () => void;
  onAskIris: () => void;
}

/**
 * Help slide-over. Three sections:
 *   1. "What's on this page" — auto-detects the surface and surfaces
 *      the matching tour with a "Start tour" CTA.
 *   2. Tour catalogue — every authored tour with a "Restart" affordance
 *      and a check mark if the user has already completed it.
 *   3. "Ask Iris about Vantage" — switches the Iris chat widget into
 *      Help mode (handled by the parent via onAskIris).
 *
 * Tour replays are controlled via a `startSignal` counter — each
 * "Start" click bumps the signal so the GuidedTour effect re-fires
 * even if the user starts the same tour twice.
 */
export function HelpDrawer({ open, onClose, onAskIris }: Props) {
  const pathname = usePathname() ?? "";
  const activeTour = useMemo(() => tourForPathname(pathname), [pathname]);
  const [signals, setSignals] = useState<Record<string, number>>({});
  const [activeRunner, setActiveRunner] = useState<TourEntry | null>(null);
  const [completed, setCompleted] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const next: Record<string, string> = {};
    for (const t of TOUR_CATALOGUE) {
      const v = localStorage.getItem(`vantage_tour_${t.id}`);
      if (v) next[t.id] = v;
    }
    setCompleted(next);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  function startTour(t: TourEntry) {
    setActiveRunner(t);
    setSignals((s) => ({ ...s, [t.id]: (s[t.id] ?? 0) + 1 }));
    onClose();
  }

  function restartAll() {
    clearAllTourFlags();
    setCompleted({});
  }

  if (!open) {
    // Still render the active GuidedTour after close so the user can
    // see the coach-marks; the drawer just goes away.
    return activeRunner ? (
      <GuidedTour
        tourId={activeRunner.id}
        steps={activeRunner.steps}
        startSignal={signals[activeRunner.id]}
      />
    ) : null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[440px] flex-col border-l border-card-border bg-card-bg shadow-2xl shadow-black/60">
        <header className="flex items-start justify-between gap-3 border-b border-card-border bg-card-bg/80 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Help · Vantage
            </h3>
            <p className="mt-0.5 text-[11px] text-muted">
              Tours for complex workflows. Ask Iris anything else.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="shrink-0 rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
          >
            ✕ Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Link
            href="/regwatch/tutorials"
            onClick={onClose}
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-brand-teal/40 bg-brand-teal/5 p-4 hover:border-brand-teal"
          >
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
                Video tours
              </p>
              <h4 className="mt-1 text-sm font-semibold text-foreground">
                Watch the {VIDEO_TOUR_COUNT} product walkthroughs
              </h4>
              <p className="mt-1 text-xs text-muted">
                {VIDEO_TOUR_SUMMARY} — ~1 min each.
              </p>
            </div>
            <span className="shrink-0 text-brand-teal">▶</span>
          </Link>

          {activeTour && (
            <section className="mb-5 rounded-xl border border-brand-blue/40 bg-brand-blue/5 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-brand-blue">
                On this page
              </p>
              <h4 className="mt-1 text-sm font-semibold text-foreground">
                {activeTour.title}
              </h4>
              <p className="mt-1 text-xs text-muted">{activeTour.subtitle}</p>
              <button
                type="button"
                onClick={() => startTour(activeTour)}
                className="mt-3 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90"
              >
                Start guided tour →
              </button>
            </section>
          )}

          <section>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted">
              All tours
            </p>
            <ul className="space-y-2">
              {TOUR_CATALOGUE.map((t) => (
                <li
                  key={t.id}
                  className="rounded-md border border-card-border bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-muted">{t.subtitle}</p>
                      {completed[t.id] && (
                        <p className="mt-1 text-[10px] text-brand-teal">
                          ✓ Completed
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => startTour(t)}
                      className="shrink-0 rounded-md border border-card-border bg-background px-2 py-1 text-[10px] text-foreground hover:border-brand-blue"
                    >
                      {completed[t.id] ? "Restart" : "Start"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 rounded-xl border border-card-border bg-card-bg/40 p-4">
            <p className="text-xs font-medium text-foreground">
              Ask Iris about Vantage
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Iris can answer product questions like &quot;How do I cite a
              clause?&quot; or &quot;What does &lsquo;in review&rsquo; mean?&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                onAskIris();
                onClose();
              }}
              className="mt-3 rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-1.5 text-xs font-medium text-brand-teal hover:bg-brand-teal/20"
            >
              Open Iris in Help mode →
            </button>
          </section>

          <section className="mt-5 text-[10px] text-muted">
            <button
              type="button"
              onClick={restartAll}
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Reset tour completion flags
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}
