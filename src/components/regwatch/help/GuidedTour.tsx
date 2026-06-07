"use client";

import { useEffect, useRef } from "react";

/**
 * driver.js wrapper. Loads the library lazily so the help machinery
 * doesn't bloat every page bundle — only the surfaces that actually
 * render <GuidedTour /> pay the ~10 KB cost.
 *
 * Usage:
 *   <GuidedTour
 *     tourId="compose-v1"
 *     steps={composeTourSteps}
 *     autoStartOnFirstVisit
 *     trigger={runOnDemand} // optional ref-like to programmatically start
 *   />
 *
 * Local-storage gate: each tourId is keyed `vantage_tour_<tourId>` and
 * stamped on completion so we don't auto-replay. The Help drawer's
 * "Restart" button clears all keys with the `vantage_tour_` prefix.
 */

export interface TourStep {
  /** CSS selector for the element to highlight (e.g. '#compose-cite-btn'). */
  element: string;
  title: string;
  body: string;
  /** Where the popover sits relative to the highlighted element. */
  side?: "top" | "bottom" | "left" | "right" | "over";
  align?: "start" | "center" | "end";
}

interface Props {
  tourId: string;
  steps: TourStep[];
  autoStartOnFirstVisit?: boolean;
  /** If set, calling this from a parent starts the tour (controlled mode). */
  startSignal?: number;
}

export function GuidedTour({
  tourId,
  steps,
  autoStartOnFirstVisit,
  startSignal,
}: Props) {
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const flagKey = `vantage_tour_${tourId}`;

    async function start(force: boolean) {
      if (cancelled) return;
      if (!force && localStorage.getItem(flagKey)) return;
      if (startedRef.current) return;
      startedRef.current = true;

      // Lazy import keeps the library out of every bundle.
      const { driver } = await import("driver.js");
      await import("driver.js/dist/driver.css");

      const d = driver({
        showProgress: true,
        smoothScroll: true,
        allowClose: true,
        popoverClass: "vantage-tour-popover",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Finish",
        onDestroyed: () => {
          localStorage.setItem(flagKey, new Date().toISOString());
          startedRef.current = false;
        },
        steps: steps.map((s) => ({
          element: s.element,
          popover: {
            title: s.title,
            description: s.body,
            side: s.side,
            align: s.align,
          },
        })),
      });
      d.drive();
    }

    if (startSignal !== undefined) {
      start(true);
    } else if (autoStartOnFirstVisit) {
      // Defer one tick to let the page finish painting so element
      // selectors actually resolve.
      const t = setTimeout(() => start(false), 800);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [tourId, steps, autoStartOnFirstVisit, startSignal]);

  return null;
}

/** Clears every per-tour completion flag — used by the Help drawer's reset CTA. */
export function clearAllTourFlags() {
  if (typeof localStorage === "undefined") return;
  const toClear: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("vantage_tour_")) toClear.push(key);
  }
  for (const k of toClear) localStorage.removeItem(k);
}
