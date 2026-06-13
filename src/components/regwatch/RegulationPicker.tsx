"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchRegulationsForPicker,
  type RegulationPickerResult,
} from "@/lib/regwatch/regulation-picker-actions";
import { RegulationViewer } from "@/components/regwatch/RegulationViewer";

interface Props {
  /** Current value — null = nothing picked yet. */
  value: RegulationPickerResult | null;
  onChange: (next: RegulationPickerResult | null) => void;
  placeholder?: string;
  /** Clause anchor input value (lifted up to the form). */
  clauseAnchor?: string;
  onClauseAnchorChange?: (next: string) => void;
  /** Clause text snippet — captured from the regulation viewer drawer. */
  clauseText?: string;
  onClauseTextChange?: (next: string) => void;
  showClauseField?: boolean;
}

/**
 * Hybrid regulation autocomplete + clause picker. Powers LinkRegulationForm
 * and CreateObligationForm.
 *
 *   - Debounced 200ms keystroke → server action that runs hybrid retrieval
 *     (Voyage + FTS) AND metadata fallback (ILIKE on title/citation/summary
 *     + topics[] containment). The fallback catches items where the term is
 *     in the topics taxonomy but not in body_search (e.g. "methane" tagged
 *     items whose body uses "CH4") and the no-Voyage-yet case.
 *   - Default browse (empty query) excludes notices/press releases and
 *     ranks by status (in-force > proposed > amended) then last_changed_at,
 *     so admins see real regulations first.
 *   - Each result carries instrumentType and is badged accordingly.
 *   - Notices toggle re-runs the search with includeNotices=true so users
 *     can opt-in when they want to attach an enforcement notice.
 *   - "View & pick clause" opens the RegulationViewer drawer; selecting a
 *     paragraph captures both anchor (Article 6, ¶12, etc.) and the
 *     paragraph text.
 */
export function RegulationPicker({
  value,
  onChange,
  placeholder = "Search by citation, regulator, topic, or paste a UUID…",
  clauseAnchor = "",
  onClauseAnchorChange,
  clauseText = "",
  onClauseTextChange,
  showClauseField = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegulationPickerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [includeNotices, setIncludeNotices] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside-click (but not when the viewer is open).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (viewerOpen) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [viewerOpen]);

  function runSearch(q: string, withNotices = includeNotices) {
    startTransition(async () => {
      const res = await searchRegulationsForPicker({
        query: q,
        limit: 15,
        includeNotices: withNotices,
      });
      setResults(res);
    });
  }

  function onInput(next: string) {
    setQuery(next);
    setOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runSearch(next), 200);
  }

  function onFocus() {
    setOpen(true);
    if (results.length === 0) runSearch("");
  }

  function pick(r: RegulationPickerResult) {
    onChange(r);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onChange(null);
    setQuery("");
    onClauseAnchorChange?.("");
    onClauseTextChange?.("");
    runSearch("");
  }

  function toggleNotices() {
    const next = !includeNotices;
    setIncludeNotices(next);
    runSearch(query, next);
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {value ? (
        <div className="rounded-lg border border-brand-teal/40 bg-brand-teal/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted">
                  {value.jurisdictionCode}
                </span>
                <span className="text-muted">{value.regulatorName}</span>
                <span className="text-muted">·</span>
                <span className="font-mono text-foreground">{value.citation}</span>
                {value.instrumentType && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                      value.isNotice
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-brand-blue/15 text-foreground"
                    }`}
                  >
                    {value.instrumentType}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-foreground">
                {value.title}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {showClauseField && (
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-teal hover:text-brand-teal"
                  title="Read the full regulation and pick a clause"
                >
                  📖 View &amp; pick clause
                </button>
              )}
              <button
                type="button"
                onClick={clear}
                className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-muted hover:border-brand-blue hover:text-foreground"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => onInput(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            className="w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-md border border-card-border bg-card-bg shadow-lg">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-card-border bg-card-bg/95 px-3 py-1.5 text-[10px]">
                <span className="text-muted">
                  {query.length < 2
                    ? "Suggested regulations"
                    : `Results for "${query}"`}
                </span>
                <label className="flex items-center gap-1 text-muted">
                  <input
                    type="checkbox"
                    checked={includeNotices}
                    onChange={toggleNotices}
                    className="h-3 w-3"
                  />
                  Show news / notices
                </label>
              </div>
              {pending && (
                <p className="px-3 py-2 text-[11px] text-muted">Searching…</p>
              )}
              {!pending && results.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-muted">
                  No matches. Try a topic (&quot;methane&quot;), a regulator
                  (&quot;ECHA&quot;), or paste a citation. Toggle &quot;Show news
                  / notices&quot; if you&apos;re looking for an enforcement notice.
                </p>
              )}
              {!pending && results.length > 0 && (
                <ul className="divide-y divide-card-border">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => pick(r)}
                        className="block w-full px-3 py-2 text-start text-sm hover:bg-brand-navy/30"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="rounded bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted">
                            {r.jurisdictionCode}
                          </span>
                          <span className="text-muted">{r.regulatorName}</span>
                          <span className="text-muted">·</span>
                          <span className="font-mono text-foreground">
                            {r.citation}
                          </span>
                          {r.instrumentType && (
                            <span
                              className={`rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                                r.isNotice
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-brand-blue/15 text-foreground"
                              }`}
                            >
                              {r.instrumentType}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-foreground">
                          {r.title}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showClauseField && value && onClauseAnchorChange && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Clause / Section (optional)
            </span>
            <input
              value={clauseAnchor}
              onChange={(e) => onClauseAnchorChange(e.target.value)}
              placeholder="e.g. Article 6, §261.4(b)(7), Annex IV — or click View & pick clause"
              className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          </label>
          {clauseText && onClauseTextChange && (
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                Clause text snippet
              </span>
              <textarea
                value={clauseText}
                onChange={(e) => onClauseTextChange(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
            </label>
          )}
          <p className="text-[10px] text-muted">
            Pin to a specific section. Leave empty to apply the whole
            regulation.
          </p>
        </div>
      )}

      {viewerOpen && value && (
        <RegulationViewer
          regulationId={value.id}
          initialClauseAnchor={clauseAnchor}
          initialClauseText={clauseText}
          onClose={() => setViewerOpen(false)}
          onApply={({ clauseAnchor: a, clauseText: t }) => {
            onClauseAnchorChange?.(a ?? "");
            onClauseTextChange?.(t ?? "");
          }}
        />
      )}
    </div>
  );
}
