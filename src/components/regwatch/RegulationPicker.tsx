"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchRegulationsForPicker,
  type RegulationPickerResult,
} from "@/lib/regwatch/regulation-picker-actions";

interface Props {
  /** Current value — null = nothing picked yet. */
  value: RegulationPickerResult | null;
  onChange: (next: RegulationPickerResult | null) => void;
  placeholder?: string;
  /** Free-form clause anchor input — surfaced beneath the regulation picker. */
  clauseAnchor?: string;
  onClauseAnchorChange?: (next: string) => void;
  showClauseField?: boolean;
}

/**
 * Hybrid regulation autocomplete + optional clause-anchor field. Powers
 * LinkRegulationForm and CreateObligationForm.
 *
 * - Debounced 200ms keystroke → server action → top-10 candidates.
 * - Click result to pick; pick is sticky (showing as a chip with "Change").
 * - Empty query shows the 10 most-recently-changed regulations as a starter.
 */
export function RegulationPicker({
  value,
  onChange,
  placeholder = "Search by citation, regulator, or topic…",
  clauseAnchor = "",
  onClauseAnchorChange,
  showClauseField = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegulationPickerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside-click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function runSearch(q: string) {
    startTransition(async () => {
      const res = await searchRegulationsForPicker({ query: q, limit: 10 });
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
    runSearch("");
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
              </div>
              <p className="mt-1 truncate text-sm text-foreground">
                {value.title}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-muted hover:border-brand-blue hover:text-foreground"
            >
              Change
            </button>
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
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border border-card-border bg-card-bg shadow-lg">
              {pending && (
                <p className="px-3 py-2 text-[11px] text-muted">Searching…</p>
              )}
              {!pending && results.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-muted">
                  No matches. Try a regulator name (&quot;ECHA&quot;), a topic
                  (&quot;methane&quot;), or paste a citation.
                </p>
              )}
              {!pending && results.length > 0 && (
                <ul className="divide-y divide-card-border">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => pick(r)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-navy/30"
                      >
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="rounded bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted">
                            {r.jurisdictionCode}
                          </span>
                          <span className="text-muted">{r.regulatorName}</span>
                          <span className="text-muted">·</span>
                          <span className="font-mono text-foreground">
                            {r.citation}
                          </span>
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
        <div>
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Clause / Section (optional)
            </span>
            <input
              value={clauseAnchor}
              onChange={(e) => onClauseAnchorChange(e.target.value)}
              placeholder="e.g. Article 6, §261.4(b)(7), Annex IV"
              className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          </label>
          <p className="mt-1 text-[10px] text-muted">
            Pin to a specific section. Leave empty to link / attach the whole
            regulation.
          </p>
        </div>
      )}
    </div>
  );
}
