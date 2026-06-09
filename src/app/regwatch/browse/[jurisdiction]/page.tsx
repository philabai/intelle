import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getJurisdictionSummaries,
  listRegulations,
  listRegulators,
  type BrowseFilters as BrowseFiltersInput,
} from "@/lib/regwatch/queries";
import { getJurisdictionHierarchy } from "@/lib/regwatch/regulatory-sections";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { BrowseFilters } from "@/components/regwatch/BrowseFilters";
import { BrowseSearchInput } from "@/components/regwatch/BrowseSearchInput";
import { EmptyState } from "@/components/regwatch/EmptyState";
import { HierarchyTree } from "@/components/regwatch/browse/HierarchyTree";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ jurisdiction: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickFilter(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function JurisdictionBrowsePage({ params, searchParams }: Props) {
  const { jurisdiction } = await params;
  const raw = await searchParams;
  const jurisdictionCode = jurisdiction.toUpperCase();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    summaries,
    regulators,
    hierarchyRoots,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getJurisdictionSummaries(),
    listRegulators(),
    getJurisdictionHierarchy(jurisdictionCode),
  ]);

  const summary = summaries.find((s) => s.jurisdiction_code === jurisdictionCode);
  if (!summary) notFound();

  const filters: BrowseFiltersInput = {
    jurisdiction: jurisdictionCode,
    regulator: pickFilter(raw, "regulator"),
    topic: pickFilter(raw, "topic"),
    instrument_type: pickFilter(raw, "instrument_type"),
    status: pickFilter(raw, "status"),
    q: pickFilter(raw, "q"),
    hideNews: pickFilter(raw, "hide_news") !== "0",
  };

  // View mode: the eCFR-style hierarchy tree, or the flat filtered list.
  // Default to the tree when one exists and the user hasn't engaged a
  // filter/search (a filter implies they want the flat result list).
  const hasHierarchy = hierarchyRoots.length > 0;
  const hasActiveFilters = Boolean(
    filters.regulator ||
      filters.topic ||
      filters.instrument_type ||
      filters.status ||
      filters.q,
  );
  const viewParam = pickFilter(raw, "view");
  const view: "tree" | "list" =
    viewParam === "tree"
      ? "tree"
      : viewParam === "list"
        ? "list"
        : hasHierarchy && !hasActiveFilters
          ? "tree"
          : "list";

  const items = view === "list" ? await listRegulations(filters, 100) : [];

  const jurisdictionOptions = summaries.map((s) => ({
    code: s.jurisdiction_code,
    name: s.jurisdiction_name,
    count: Number(s.item_count),
  }));
  const regulatorOptions = regulators
    .filter((r) => r.jurisdiction_code === jurisdictionCode)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      short_name: r.short_name,
      jurisdiction_code: r.jurisdiction_code,
      count: r.item_count,
    }));

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/browse" className="hover:text-foreground">
              All jurisdictions
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{summary.jurisdiction_name}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {summary.jurisdiction_name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {Number(summary.regulator_count).toLocaleString()} regulators ·{" "}
            {Number(summary.item_count).toLocaleString()} regulations ·{" "}
            <span className="text-brand-teal">
              {Number(summary.recent_item_count).toLocaleString()} updated in the last 30 days
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Suspense fallback={null}>
              <BrowseSearchInput />
            </Suspense>
            {hasHierarchy && (
              <div className="inline-flex overflow-hidden rounded-md border border-card-border text-xs">
                <Link
                  href={`/regwatch/browse/${jurisdiction}?view=tree`}
                  className={`px-3 py-1.5 ${
                    view === "tree"
                      ? "bg-brand-blue/15 font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Hierarchy
                </Link>
                <Link
                  href={`/regwatch/browse/${jurisdiction}?view=list`}
                  className={`border-l border-card-border px-3 py-1.5 ${
                    view === "list"
                      ? "bg-brand-blue/15 font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  List
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {view === "tree" ? (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <HierarchyTree roots={hierarchyRoots} jurisdictionCode={jurisdictionCode} />
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
          <Suspense fallback={null}>
            <BrowseFilters
              jurisdictions={jurisdictionOptions}
              regulators={regulatorOptions}
              lockedJurisdiction={jurisdictionCode}
            />
          </Suspense>

          <section>
            {items.length === 0 ? (
              <EmptyState
                title="No regulations match these filters."
                description="Try clearing a facet or broadening your search."
              />
            ) : (
              <>
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
                  Showing {items.length} {items.length === 1 ? "regulation" : "regulations"}
                </p>
                <div className="overflow-hidden rounded-xl border border-card-border bg-background">
                  {items.map((item) => (
                    <RegulationRow key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </RegwatchAppShell>
  );
}
