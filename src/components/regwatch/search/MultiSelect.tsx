"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

/**
 * Compact multi-select dropdown — a button that opens a checkbox popover.
 * Controlled (value: string[] / onChange). Long option lists (>8) get a filter
 * box. Closes on outside-click. Purely local — the parent decides when to apply
 * the selection (the Search page defers it to submit).
 */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "All",
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = new Set(value);
  const searchable = options.length > 8;
  const shown = filter
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  function toggle(v: string) {
    const next = new Set(value);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange([...next]);
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? "1 selected")
        : `${value.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-card-bg px-3 py-2 text-sm focus:border-brand-blue focus:outline-none ${
          value.length > 0 ? "border-brand-blue/60 text-foreground" : "border-card-border text-muted"
        }`}
      >
        <span className="truncate">{summary}</span>
        <svg
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-card-border bg-background shadow-xl shadow-black/40">
          {searchable && (
            <div className="border-b border-card-border p-2">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${label.toLowerCase()}…`}
                autoFocus
                className="w-full rounded border border-card-border bg-card-bg px-2 py-1 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              />
            </div>
          )}
          <ul className="max-h-56 overflow-auto py-1">
            {shown.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted">No matches</li>
            )}
            {shown.map((o) => {
              const checked = selected.has(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-card-bg"
                  >
                    <span
                      className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border text-[9px] leading-none ${
                        checked
                          ? "border-brand-blue bg-brand-blue text-white"
                          : "border-card-border"
                      }`}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="truncate text-foreground">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {value.length > 0 && (
            <div className="border-t border-card-border p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded px-2 py-1 text-left text-[11px] text-muted hover:text-foreground"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
