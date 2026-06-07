"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getRegulationOriginalDocument } from "@/lib/regwatch/regulation-original-actions";

const PdfViewer = dynamic(
  () => import("../documents/editor/PdfViewer").then((m) => m.default),
  { ssr: false, loading: () => <PaneLoading /> },
);

interface Props {
  regId: string;
  sourceUrl: string | null;
  /** When the SSR page already knows there's no cached PDF, we can show a
   *  "capturing…" affordance instead of a blank frame. */
  hasCached: boolean;
}

/**
 * "Original" tab body — shows the canonical source document.
 *
 * - PDF source → react-pdf viewer reused from internal docs
 * - HTML source → sandboxed iframe rendering the cached HTML
 * - Capture failed / disallowed → friendly "open at source" CTA
 *
 * Capture is lazy: the action runs on mount, caches in
 * regwatch-public storage, returns a 1h signed URL. Subsequent visits
 * reuse the cache.
 */
export function RegulationOriginalPane({ regId, sourceUrl, hasCached }: Props) {
  const [state, setState] = useState<{
    loading: boolean;
    signedUrl?: string;
    mime?: string;
    error?: string;
    reason?: string;
    sourceUrl?: string;
  }>({ loading: true, sourceUrl: sourceUrl ?? undefined });
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    getRegulationOriginalDocument({ regId })
      .then((r) => {
        if (cancelled) return;
        setState({
          loading: false,
          signedUrl: r.signedUrl,
          mime: r.mime,
          error: r.error,
          reason: r.reason,
          sourceUrl: r.sourceUrl ?? sourceUrl ?? undefined,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({ loading: false, error: (e as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [regId, sourceUrl]);

  if (state.loading) {
    return (
      <PaneLoading
        label={
          hasCached ? "Loading cached document…" : "Fetching from publisher…"
        }
      />
    );
  }

  if (state.reason === "disallowed") {
    return (
      <CtaPane
        title="Publisher requested no redistribution"
        body="We don't cache this publisher's documents in-app. Open the canonical source on the publisher's site."
        sourceUrl={state.sourceUrl}
      />
    );
  }

  if (state.reason === "too_large") {
    return (
      <CtaPane
        title="Source exceeds 50 MB"
        body="The source document is larger than the in-app cache ceiling. Open the canonical source on the publisher's site."
        sourceUrl={state.sourceUrl}
      />
    );
  }

  if (state.error || !state.signedUrl) {
    return (
      <CtaPane
        title="Source temporarily unavailable"
        body={
          state.error
            ? `Couldn't fetch from the publisher: ${state.error}. Try again later, or open the canonical source.`
            : "Couldn't fetch from the publisher. Try again later, or open the canonical source."
        }
        sourceUrl={state.sourceUrl}
      />
    );
  }

  if (state.mime === "application/pdf") {
    return (
      <div>
        <div className="mb-3 flex items-center justify-end gap-1">
          <ZoomControl zoom={zoom} setZoom={setZoom} />
        </div>
        <div className="max-h-[80vh] overflow-auto rounded-md bg-[#0a0e1a]">
          <PdfViewer
            url={state.signedUrl}
            zoom={zoom}
            numPages={numPages}
            onLoadSuccess={setNumPages}
            onLoadError={(msg: string) =>
              setState((s) => ({ ...s, error: msg }))
            }
          />
        </div>
      </div>
    );
  }

  // HTML source — iframe-with-src was rendering as raw HTML text in
  // some browsers (Supabase Storage serving with text/plain Content-
  // Type, or X-Frame-Options leaking) so we drop iframe entirely for
  // HTML and show a clean CTA to open at the publisher. PDFs remain
  // inline via react-pdf above. This matches what users expect for
  // "source document" — the EUR-Lex / regulator page opens in a new
  // tab with full styling instead of cramped inside our viewport.
  return (
    <div className="rounded-xl border border-card-border bg-card-bg/40 p-8 text-center">
      <p className="text-2xl">📄</p>
      <p className="mt-3 text-sm font-medium text-foreground">
        Source is an HTML page at the publisher&apos;s site
      </p>
      <p className="mt-2 max-w-md text-xs text-muted">
        Regulator HTML pages (EUR-Lex, GOV.UK, ESMA, etc.) carry their
        own navigation, search and styling — opening them inline strips
        most of that. We open them in a new tab so you see the full
        canonical document the regulator publishes.
      </p>
      {state.sourceUrl && (
        <a
          href={state.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue/90"
        >
          Open at publisher ↗
        </a>
      )}
      <p className="mt-4 break-all text-[10px] text-muted">
        {state.sourceUrl}
      </p>
    </div>
  );
}

function PaneLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-md border border-card-border bg-card-bg/40 text-xs text-muted">
      {label}
    </div>
  );
}

function CtaPane({
  title,
  body,
  sourceUrl,
}: {
  title: string;
  body: string;
  sourceUrl: string | undefined;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg/40 p-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-xs text-muted">{body}</p>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-md border border-brand-teal/40 bg-brand-teal/10 px-4 py-2 text-xs font-medium text-brand-teal hover:bg-brand-teal/20"
        >
          Open at source ↗
        </a>
      )}
    </div>
  );
}

function ZoomControl({
  zoom,
  setZoom,
}: {
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const pct = Math.round(zoom * 100);
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border border-card-border text-xs">
      <button
        type="button"
        onClick={() => setZoom(Math.max(0.5, Math.round((zoom - 0.1) * 100) / 100))}
        disabled={zoom <= 0.5}
        className="px-2 py-1 hover:bg-card-bg disabled:opacity-50"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => setZoom(1)}
        className="border-x border-card-border px-2 py-1 font-mono text-[11px] hover:bg-card-bg"
      >
        {pct}%
      </button>
      <button
        type="button"
        onClick={() => setZoom(Math.min(2, Math.round((zoom + 0.1) * 100) / 100))}
        disabled={zoom >= 2}
        className="px-2 py-1 hover:bg-card-bg disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
