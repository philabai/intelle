"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface PreviewTarget {
  kind: "regulation" | "doc";
  id: string;
}

interface PreviewData {
  kind: "regulation" | "doc";
  title: string;
  meta: string;
  bodyText: string;
  href: string;
  sourceUrl: string | null;
}

/**
 * Right-side preview drawer (~half page). Opens when a citation, source card, or
 * result row is clicked; lazy-fetches the item's body from /api/regwatch/preview
 * and offers a link to open the full regulation / document. Closes on backdrop
 * click, the ✕, or Escape.
 */
export function PreviewDrawer({
  target,
  onClose,
}: {
  target: PreviewTarget | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setData(null);
    setError(null);
    setLoading(true);
    const ctrl = new AbortController();
    fetch(
      `/api/regwatch/preview?kind=${target.kind}&id=${encodeURIComponent(target.id)}`,
      { signal: ctrl.signal },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d: PreviewData) => setData(d))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setError("Couldn't load this preview.");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const isOpen = !!target;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl transform flex-col bg-background shadow-2xl shadow-black/50 transition-transform duration-300 ease-out sm:w-[88vw] lg:w-[50vw] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-card-border p-4">
          <div className="min-w-0">
            {data ? (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-teal">
                  {data.kind === "doc" ? "Company document" : "Regulation"}
                </p>
                <h2 className="mt-0.5 text-base font-semibold leading-snug text-foreground">
                  {data.title}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">{data.meta}</p>
              </>
            ) : (
              <p className="text-sm text-muted">{loading ? "Loading…" : "Preview"}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 rounded-md p-1.5 text-muted transition hover:bg-card-bg hover:text-foreground"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {loading && !data && (
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-card-bg" />
              <div className="h-3 w-full animate-pulse rounded bg-card-bg" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-card-bg" />
            </div>
          )}
          {data && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {data.bodyText || "No preview text available for this item."}
            </p>
          )}
        </div>

        {data && (
          <footer className="flex items-center gap-3 border-t border-card-border p-4">
            <Link
              href={data.href}
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              Open full {data.kind === "doc" ? "document" : "regulation"} →
            </Link>
            {data.sourceUrl && (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-foreground"
              >
                Source ↗
              </a>
            )}
          </footer>
        )}
      </aside>
    </>
  );
}
