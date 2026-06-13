"use client";

import { useEffect, useState, useTransition } from "react";
import {
  fetchRegulationBodyFromSource,
  getRegulationBody,
  type RegulationBody,
  type BodyParagraph,
} from "@/lib/regwatch/regulation-body-actions";

interface Props {
  regulationId: string;
  /** Pre-filled value for the clause picker (sticky across re-opens). */
  initialClauseAnchor?: string;
  initialClauseText?: string;
  onClose: () => void;
  onApply: (next: { clauseAnchor: string | null; clauseText: string | null }) => void;
}

/**
 * Slide-over reader for a regulation's full body. Users:
 *   1. Skim paragraphs (paragraph rail on the left jumps to headings).
 *   2. Click "Use this clause" on any paragraph to capture both the anchor
 *      (detected heading like "Article 6" or fallback "¶12") and the
 *      paragraph text.
 *   3. Optionally edit the anchor + text before "Apply" closes the drawer.
 *
 * The captured clause flows back into RegulationPicker (which lifts the
 * values up to LinkRegulationForm or CreateObligationForm).
 */
export function RegulationViewer({
  regulationId,
  initialClauseAnchor = "",
  initialClauseText = "",
  onClose,
  onApply,
}: Props) {
  const [body, setBody] = useState<RegulationBody | null>(null);
  const [pending, startTransition] = useTransition();
  const [fetching, startFetching] = useTransition();
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(initialClauseAnchor);
  const [clauseText, setClauseText] = useState(initialClauseText);

  useEffect(() => {
    startTransition(async () => {
      const res = await getRegulationBody({ id: regulationId });
      if (!res) {
        setError(
          "Couldn't load the regulation body. The corpus may be missing the source text for this item — link the whole regulation or paste the section manually below.",
        );
        return;
      }
      setBody(res);
    });
  }, [regulationId]);

  // ESC closes; body lock prevents background scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function pickClause(p: BodyParagraph) {
    const a = p.detectedAnchor ?? `¶${p.index}`;
    setAnchor(a);
    setClauseText(p.text);
  }

  function fetchFromSource() {
    setFetchMessage(null);
    setError(null);
    startFetching(async () => {
      const res = await fetchRegulationBodyFromSource({ id: regulationId });
      if (!res.ok || !res.body) {
        setError(res.error ?? "Could not load body from source");
        return;
      }
      setBody(res.body);
      setFetchMessage(
        `Loaded ${res.extractedChars?.toLocaleString() ?? "?"} chars from source · ${res.body.paragraphs.length} paragraphs`,
      );
    });
  }

  const isThin = !!body && (body.summaryOnly || body.paragraphs.length <= 2);

  function apply() {
    onApply({
      clauseAnchor: anchor.trim() || null,
      clauseText: clauseText.trim() || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="flex h-full w-full max-w-4xl flex-col bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-card-border px-5 py-4">
          <div className="min-w-0">
            {body ? (
              <>
                <p className="text-xs uppercase tracking-wider text-brand-teal">
                  {body.jurisdictionCode} · {body.regulatorName}
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-foreground">
                  {body.title}
                </h2>
                <p className="text-[11px] text-muted">
                  <span className="font-mono">{body.citation}</span>
                  {body.status && <span className="ms-2">· {body.status}</span>}
                </p>
              </>
            ) : (
              <h2 className="text-base font-semibold text-foreground">
                Loading regulation…
              </h2>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {body && (
              <a
                href={body.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-[11px] text-foreground hover:border-brand-blue"
              >
                Source ↗
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-foreground"
              aria-label="Close"
              title="Close the regulation viewer (Esc)"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left rail — headings */}
          {body && body.paragraphs.some((p) => p.isHeading) && (
            <aside className="hidden w-48 shrink-0 overflow-auto border-e border-card-border bg-card-bg/30 px-3 py-3 md:block">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
                Headings
              </p>
              <ul className="space-y-1 text-[11px]">
                {body.paragraphs
                  .filter((p) => p.isHeading)
                  .map((p) => (
                    <li key={p.index}>
                      <a
                        href={`#para-${p.index}`}
                        className="block truncate text-foreground/80 hover:text-brand-teal"
                      >
                        {p.detectedAnchor ?? p.text.slice(0, 60)}
                      </a>
                    </li>
                  ))}
              </ul>
            </aside>
          )}

          {/* Main body */}
          <div className="min-w-0 flex-1 overflow-auto px-5 py-4">
            {pending && !body && (
              <p className="text-xs text-muted">Loading…</p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            {body && body.paragraphs.length === 0 && (
              <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
                The corpus has no body text for this regulation. Open the
                source link in a new tab to read it, then paste the relevant
                clause text below.
              </p>
            )}
            {body && isThin && (
              <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                <p className="font-medium text-amber-200">
                  Only the regulator&apos;s short summary was ingested.
                </p>
                <p className="mt-1 text-amber-200/80">
                  The connectors only capture metadata — not the full body —
                  for this source today. Click below to fetch the full text
                  from <span className="font-mono">{body.sourceUrl}</span>,
                  parse it, and cache it on this row so subsequent views
                  load instantly.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchFromSource}
                    disabled={fetching}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-medium text-background hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {fetching ? "Fetching…" : "Load full text from source"}
                  </button>
                  <a
                    href={body.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-amber-500/40 px-3 py-1.5 text-[11px] text-amber-200 hover:bg-amber-500/10"
                  >
                    Open source ↗
                  </a>
                  {fetchMessage && (
                    <span className="text-[11px] text-amber-200/80">
                      {fetchMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
            <ol className="space-y-3">
              {body?.paragraphs.map((p) => (
                <li
                  key={p.index}
                  id={`para-${p.index}`}
                  className={`rounded-md border px-3 py-2 transition ${
                    anchor &&
                    (anchor === p.detectedAnchor || anchor === `¶${p.index}`)
                      ? "border-brand-teal/50 bg-brand-teal/5"
                      : "border-card-border bg-card-bg/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {p.detectedAnchor && (
                        <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
                          {p.detectedAnchor}
                        </p>
                      )}
                      <p
                        className={`text-xs leading-relaxed ${
                          p.isHeading
                            ? "font-medium text-foreground"
                            : "text-foreground/90"
                        }`}
                      >
                        {p.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => pickClause(p)}
                      className="shrink-0 rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-teal hover:text-brand-teal"
                    >
                      Use this clause
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer — picked clause editor */}
        <footer className="border-t border-card-border bg-card-bg/40 px-5 py-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            Selected clause
          </p>
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <input
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              placeholder="Anchor (e.g. Article 6)"
              className="rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
            <textarea
              value={clauseText}
              onChange={(e) => setClauseText(e.target.value)}
              rows={3}
              placeholder="Clause text — captured from a paragraph above, or paste / edit manually."
              className="rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAnchor("");
                setClauseText("");
              }}
              className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90"
            >
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
