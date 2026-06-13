"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

interface DrawerObligation {
  id: string;
  regulationCitation: string | null;
  regulationTitle: string | null;
  clauseAnchor: string | null;
  severity: string;
  complianceStatus: string;
  reviewStatus: string;
  assignedReviewerName: string | null;
  reviewDueAt: string | null;
}

interface DrawerData {
  asset: { id: string; name: string; code: string | null; levelLabel: string };
  obligations: DrawerObligation[];
}

const SEVERITY_BG: Record<string, string> = {
  catastrophic: "bg-red-600/30 text-red-100",
  critical: "bg-red-500/25 text-red-200",
  moderate: "bg-amber-500/25 text-amber-200",
  marginal: "bg-brand-blue/20 text-foreground",
  negligible: "bg-muted/20 text-muted",
};

const STATUS_BG: Record<string, string> = {
  "non-compliant": "bg-red-500/20 text-red-200",
  "at-risk": "bg-amber-500/20 text-amber-200",
  compliant: "bg-brand-teal/20 text-brand-teal",
  unknown: "bg-muted/20 text-muted",
};

const REVIEW_BG: Record<string, string> = {
  open: "bg-muted/20 text-muted",
  "awaiting-triage": "bg-brand-blue/20 text-foreground",
  "in-review": "bg-amber-500/20 text-amber-200",
  "pending-approval": "bg-brand-violet/30 text-foreground",
  verified: "bg-brand-teal/20 text-brand-teal",
  closed: "bg-muted/15 text-muted",
  "not-applicable": "bg-muted/15 text-muted",
};

const CLOSED_REVIEW = new Set(["closed", "not-applicable", "verified"]);
const isOpenObligation = (o: DrawerObligation) =>
  !CLOSED_REVIEW.has(o.reviewStatus);

/**
 * Right-side slider showing the compliance obligations tied to one asset.
 * Opens from the asset hierarchy tree so the user can review (and click into)
 * compliance without leaving the page. Closes on backdrop click, ✕, or Escape.
 */
export function AssetComplianceDrawer({
  assetId,
  onClose,
}: {
  assetId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) return;
    setData(null);
    setError(null);
    setLoading(true);
    const ctrl = new AbortController();
    fetch(`/api/regwatch/asset-compliance?assetId=${encodeURIComponent(assetId)}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: DrawerData) => setData(d))
      .catch((e) => {
        if ((e as Error).name !== "AbortError")
          setError("Couldn't load this asset's compliance.");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [assetId]);

  useEffect(() => {
    if (!assetId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [assetId, onClose]);

  const isOpen = !!assetId;
  const obligations = data?.obligations ?? [];
  // Open items first, then by created order from the API.
  const sorted = [...obligations].sort(
    (a, b) => Number(isOpenObligation(b)) - Number(isOpenObligation(a)),
  );
  const openCount = obligations.filter(isOpenObligation).length;

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
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl transform flex-col bg-background shadow-2xl shadow-black/50 transition-transform duration-300 ease-out sm:w-[88vw] lg:w-[46vw] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-card-border p-4">
          <div className="min-w-0">
            {data ? (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-teal">
                  {data.asset.levelLabel} · Compliance
                </p>
                <h2 className="mt-0.5 truncate text-base font-semibold leading-snug text-foreground">
                  {data.asset.name}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {openCount > 0
                    ? `${openCount} open · ${obligations.length} total`
                    : obligations.length > 0
                      ? `${obligations.length} obligation${obligations.length === 1 ? "" : "s"} · all addressed`
                      : "No obligations pinned"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">
                {loading ? "Loading…" : "Compliance"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
              <div className="h-12 w-full animate-pulse rounded-lg bg-card-bg" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-card-bg" />
              <div className="h-12 w-5/6 animate-pulse rounded-lg bg-card-bg" />
            </div>
          )}
          {data && obligations.length === 0 && (
            <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-6 text-center text-xs text-muted">
              No obligations pinned to this asset yet.
            </p>
          )}
          {data && obligations.length > 0 && (
            <ul className="space-y-2">
              {sorted.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/regwatch/obligations/${o.id}`}
                    className="block rounded-lg border border-card-border bg-card-bg/40 p-3 transition hover:border-brand-teal/60 hover:bg-card-bg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {o.regulationCitation ? (
                          <p className="truncate text-sm text-foreground">
                            <span className="font-mono">{o.regulationCitation}</span>
                            {o.clauseAnchor && (
                              <span className="ml-1 text-[10px] text-muted">
                                · {o.clauseAnchor}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted">No regulation</p>
                        )}
                        {o.regulationTitle && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                            {o.regulationTitle}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] text-muted">→</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${SEVERITY_BG[o.severity] ?? ""}`}
                      >
                        {o.severity}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_BG[o.complianceStatus] ?? ""}`}
                      >
                        {o.complianceStatus}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${REVIEW_BG[o.reviewStatus] ?? ""}`}
                      >
                        {o.reviewStatus}
                      </span>
                      {o.assignedReviewerName && (
                        <span className="ml-auto text-[10px] text-muted">
                          {o.assignedReviewerName}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && (
          <footer className="flex items-center gap-3 border-t border-card-border p-4">
            <Link
              href={`/regwatch/assets/${data.asset.id}`}
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              Open full asset page →
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}
