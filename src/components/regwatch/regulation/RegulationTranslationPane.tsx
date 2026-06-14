"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";

interface Props {
  regId: string;
  sourceLang: string;
}

interface StatusBundle {
  status: "completed" | "in_progress" | "failed" | "not_started" | "not_needed";
  text?: string;
  translatedAt?: string;
  startedAt?: string;
  ageMs?: number;
  error?: string;
}

const KNOWN_LANGS = new Set(["ar", "fr", "es", "zh", "de"]);

const POLL_INTERVAL_MS = 2000;
const EXPECTED_DURATION_MS = 45_000;

/**
 * Translation tab body. Reliable background-job pattern:
 *   1. GET the translate endpoint to read current status.
 *   2. If not_started, POST to kick off the work (runs server-side
 *      via next/after — survives the user navigating away).
 *   3. Poll the GET endpoint every 2s until the status flips to
 *      completed (or failed).
 *   4. The translated text is persisted to the row on completion,
 *      so a user returning to the tab any time later sees the
 *      result instantly from cache.
 *
 * Progress bar fills based on elapsed-vs-expected duration —
 * Claude's API gives no real progress signal, so this is a
 * best-guess animation that caps at 95% until the result lands.
 */
export function RegulationTranslationPane({ regId, sourceLang }: Props) {
  const t = useTranslations("regwatch.discover");
  const format = useFormatter();
  const [state, setState] = useState<StatusBundle>({ status: "not_started" });
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, []);

  // Read current status; if not started, kick off; if in progress, poll.
  useEffect(() => {
    let cancelled = false;

    async function pollOnce(): Promise<void> {
      if (cancelled || !mountedRef.current) return;
      try {
        const res = await fetch(`/api/regwatch/regulations/${regId}/translate`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json()) as StatusBundle;
        if (cancelled || !mountedRef.current) return;
        setState(data);

        if (data.status === "in_progress" && typeof data.ageMs === "number") {
          setElapsedMs(data.ageMs);
        }

        // Decide what to do next.
        if (data.status === "not_started") {
          // Kick it off, then immediately poll.
          await fetch(`/api/regwatch/regulations/${regId}/translate`, {
            method: "POST",
          });
          pollTimer.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
        } else if (data.status === "in_progress") {
          pollTimer.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
        }
        // completed / failed / not_needed → stop polling
      } catch (e) {
        if (cancelled || !mountedRef.current) return;
        setState({
          status: "failed",
          error: (e as Error).message,
        });
      }
    }

    pollOnce();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [regId]);

  // Local elapsed-time ticker so the progress bar moves smoothly between
  // polls without waiting for the next server response.
  useEffect(() => {
    if (state.status !== "in_progress") {
      if (tickTimer.current) clearInterval(tickTimer.current);
      return;
    }
    if (tickTimer.current) return;
    tickTimer.current = setInterval(() => {
      setElapsedMs((ms) => ms + 250);
    }, 250);
    return () => {
      if (tickTimer.current) {
        clearInterval(tickTimer.current);
        tickTimer.current = null;
      }
    };
  }, [state.status]);

  const sourceLangLabel = KNOWN_LANGS.has(sourceLang)
    ? t(`lang.${sourceLang}`)
    : sourceLang.toUpperCase();

  return (
    <div className="space-y-4">
      <DisclaimerBanner sourceLangLabel={sourceLangLabel} />

      {state.status === "not_started" && (
        <div className="rounded-md border border-card-border bg-card-bg/40 p-6 text-center text-xs text-muted">
          {t("translatePreparing")}
        </div>
      )}

      {state.status === "in_progress" && (
        <InProgressPanel
          sourceLangLabel={sourceLangLabel}
          elapsedMs={elapsedMs}
        />
      )}

      {state.status === "failed" && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300">
          <p className="mb-2 font-medium">{t("translateFailed")}</p>
          <p>{state.error ?? t("translateUnknownError")}</p>
          <button
            type="button"
            onClick={() => {
              setState({ status: "not_started" });
              setElapsedMs(0);
              fetch(`/api/regwatch/regulations/${regId}/translate`, {
                method: "POST",
              }).then(() => {
                pollTimer.current = setTimeout(async () => {
                  const res = await fetch(
                    `/api/regwatch/regulations/${regId}/translate`,
                    { cache: "no-store" },
                  );
                  const data = (await res.json()) as StatusBundle;
                  setState(data);
                }, POLL_INTERVAL_MS);
              });
            }}
            className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20"
          >
            {t("translateRetry")}
          </button>
        </div>
      )}

      {state.status === "not_needed" && (
        <div className="rounded-md border border-brand-teal/40 bg-brand-teal/5 p-4 text-xs text-foreground">
          {t.rich("translateNotNeeded", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </div>
      )}

      {state.status === "completed" && state.text && (
        <article className="overflow-hidden rounded-xl border border-card-border bg-card-bg/40">
          <header className="flex items-center justify-between gap-2 border-b border-card-border bg-card-bg/60 px-5 py-3">
            <p className="text-[11px] text-muted">
              {t("translateMachineLabel", { lang: sourceLangLabel })}
              {state.translatedAt && (
                <>
                  {t("translateCachedPrefix")}
                  {format.relativeTime(new Date(state.translatedAt))}
                </>
              )}
            </p>
            <p className="font-mono text-[10px] text-muted">
              {t("translateCharCount", {
                count: state.text.length,
                formatted: state.text.length.toLocaleString(),
              })}
            </p>
          </header>
          {/* Own scroll container so the translation doesn't push the
              page beyond a sane viewport — matches the Original tab's
              max-h-[80vh] PDF viewer chrome. The disclaimer banner
              stays OUTSIDE this scroller so it remains visible no
              matter how far the user scrolls into the translation. */}
          <div className="max-h-[80vh] overflow-auto bg-[#0a0e1a] px-5 py-5">
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {state.text}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

function InProgressPanel({
  sourceLangLabel,
  elapsedMs,
}: {
  sourceLangLabel: string;
  elapsedMs: number;
}) {
  const t = useTranslations("regwatch.discover");
  // Progress bar fills toward 95% over EXPECTED_DURATION_MS, then holds
  // at 95% until the actual result arrives (we don't fake 100%).
  const ratio = Math.min(elapsedMs / EXPECTED_DURATION_MS, 0.95);
  const pct = Math.round(ratio * 100);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const isSlow = elapsedMs > EXPECTED_DURATION_MS;

  return (
    <div className="rounded-xl border border-brand-blue/40 bg-brand-blue/5 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {t("translateInProgressTitle", { lang: sourceLangLabel })}
        </p>
        <p className="font-mono text-[11px] text-muted">
          {t("translateElapsedSeconds", { seconds: elapsedSec })}
        </p>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {t("translateInProgressBody", { lang: sourceLangLabel })}
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-card-bg">
        <div
          className="h-full bg-brand-blue transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {isSlow ? t("translateSlowNote") : t("translateBackgroundNote")}
      </p>
    </div>
  );
}

function DisclaimerBanner({ sourceLangLabel }: { sourceLangLabel: string }) {
  const t = useTranslations("regwatch.discover");
  return (
    <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
        {t("translateDisclaimerEyebrow")}
      </p>
      <p className="mt-2 text-sm font-bold leading-snug text-foreground">
        {t.rich("translateDisclaimerLead", {
          lang: sourceLangLabel,
          underline: (chunks) => <span className="underline">{chunks}</span>,
        })}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-foreground/90">
        {t.rich("translateDisclaimerBody", {
          lang: sourceLangLabel,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {t.rich("translateDisclaimerLiability", {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
    </div>
  );
}
