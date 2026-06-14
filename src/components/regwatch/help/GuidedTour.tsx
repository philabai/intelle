"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

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
  /**
   * Optional path the tour should be on for this step. If set and the
   * current pathname differs, the wrapper pushes to it before
   * highlighting and waits for the selector to mount.
   */
  navigatePath?: string;
  /**
   * Extra px to offset scrollIntoView (default 80) so highlighted
   * elements don't end up underneath the sticky top nav.
   */
  scrollOffsetTop?: number;
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
  const t = useTranslations("regwatch.help");
  const startedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname() ?? "";
  // Keep a ref to the latest pathname so the navigation hook reads the
  // CURRENT path each time it fires (steps span multiple pages).
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let cancelled = false;
    const flagKey = `vantage_tour_${tourId}`;

    async function navigateAndWait(step: TourStep): Promise<HTMLElement | null> {
      if (
        step.navigatePath &&
        pathnameRef.current.replace(/\/$/, "") !==
          step.navigatePath.replace(/\/$/, "")
      ) {
        router.push(step.navigatePath);
      }
      return waitForSelector(step.element, 5000);
    }

    async function start(force: boolean) {
      if (cancelled) return;
      if (!force && localStorage.getItem(flagKey)) return;
      if (startedRef.current) return;
      startedRef.current = true;

      // If the very first step is on a different page, navigate there
      // before driver.js even mounts so the element exists on first paint.
      if (steps[0]) await navigateAndWait(steps[0]);
      if (cancelled) return;

      // Lazy import keeps the library out of every bundle.
      const { driver } = await import("driver.js");
      await import("driver.js/dist/driver.css");

      const d = driver({
        showProgress: true,
        smoothScroll: true,
        allowClose: true,
        popoverClass: "vantage-tour-popover",
        nextBtnText: t("tourNext"),
        prevBtnText: t("tourBack"),
        doneBtnText: t("tourFinish"),
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
          // driver.js fires onHighlightStarted before drawing the
          // spotlight. Use that window to push to the step's
          // navigatePath (if any) and wait for the selector to mount,
          // then scroll the element into the middle of the viewport.
          onHighlightStarted: async () => {
            const el = await navigateAndWait(s);
            if (el && typeof el.scrollIntoView === "function") {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              // Compensate for sticky-nav top overlap.
              const offset = s.scrollOffsetTop ?? 80;
              if (offset > 0) {
                setTimeout(() => window.scrollBy({ top: -offset, behavior: "smooth" }), 250);
              }
            }
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
  }, [tourId, steps, autoStartOnFirstVisit, startSignal, t]);

  return null;
}

/**
 * Polls the DOM up to `timeoutMs` for the first element matching
 * `selector`. Resolves with the element or null on timeout. Used so
 * tour steps that navigate to a new page can wait for React to render
 * the target before driver.js tries to highlight it.
 */
async function waitForSelector(
  selector: string,
  timeoutMs: number,
): Promise<HTMLElement | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) return el;
    await new Promise((r) => setTimeout(r, 100));
  }
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
