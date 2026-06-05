import { Suspense } from "react";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getJurisdictionSummaries,
  listRegulations,
  listRegulators,
  type BrowseFilters as BrowseFiltersInput,
} from "@/lib/regwatch/queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { JurisdictionTile } from "@/components/regwatch/JurisdictionTile";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { BrowseFilters } from "@/components/regwatch/BrowseFilters";
import { BrowseSearchInput } from "@/components/regwatch/BrowseSearchInput";
import { EmptyState } from "@/components/regwatch/EmptyState";

export const metadata = { title: "Browse Regulations" };
export const dynamic = "force-dynamic";

interface Props {
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

export default async function BrowsePage({ searchParams }: Props) {
  const raw = await searchParams;
  const hideNewsParam = pickFilter(raw, "hide_news");
  // hide_news defaults to ON; pass "0" to include news/notices.
  const hideNews = hideNewsParam !== "0";
  const filters: BrowseFiltersInput = {
    jurisdiction: pickFilter(raw, "jurisdiction"),
    regulator: pickFilter(raw, "regulator"),
    topic: pickFilter(raw, "topic"),
    instrument_type: pickFilter(raw, "instrument_type"),
    status: pickFilter(raw, "status"),
    q: pickFilter(raw, "q"),
    hideNews,
  };
  // Active means the user has any narrowing filter. hide_news is a default-on
  // toggle so it doesn't count as "active".
  const hasActiveFilters =
    !!filters.jurisdiction ||
    !!filters.regulator ||
    !!filters.topic ||
    !!filters.instrument_type ||
    !!filters.status ||
    !!filters.q;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [summaries, regulators, items] = await Promise.all([
    getJurisdictionSummaries(),
    listRegulators(),
    hasActiveFilters ? listRegulations(filters) : Promise.resolve([]),
  ]);

  const totalItems = summaries.reduce((acc, s) => acc + Number(s.item_count), 0);
  const totalRegulators = summaries.reduce((acc, s) => acc + Number(s.regulator_count), 0);
  const totalRecent = summaries.reduce((acc, s) => acc + Number(s.recent_item_count), 0);

  const jurisdictionOptions = summaries.map((s) => ({
    code: s.jurisdiction_code,
    name: s.jurisdiction_name,
    count: Number(s.item_count),
  }));

  const regulatorOptions = regulators.map((r) => ({
    slug: r.slug,
    name: r.name,
    short_name: r.short_name,
    jurisdiction_code: r.jurisdiction_code,
    count: r.item_count,
  }));

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Global regulations corpus
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Browse {totalItems.toLocaleString()} regulations from{" "}
            {totalRegulators.toLocaleString()} regulators
          </h1>
          <p className="mt-2 text-sm text-muted">
            {totalRecent.toLocaleString()} updated in the last 30 days. Public corpus —
            no signup required to read.
          </p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <BrowseSearchInput />
            </Suspense>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
        <Suspense fallback={null}>
          <BrowseFilters
            jurisdictions={jurisdictionOptions}
            regulators={regulatorOptions}
          />
        </Suspense>

        <section>
          {hasActiveFilters ? (
            <ResultList items={items} filters={filters} />
          ) : (
            <TileGrid summaries={summaries} />
          )}
        </section>
      </div>
    </RegwatchAppShell>
  );
}

function TileGrid({
  summaries,
}: {
  summaries: Awaited<ReturnType<typeof getJurisdictionSummaries>>;
}) {
  if (summaries.length === 0) {
    return (
      <EmptyState
        title="Corpus is empty."
        description="Apply the seed migration at supabase/migrations/20260605_regwatch_regulator_seed.sql, or wait for Phase 1.x connectors to start writing regulators + items."
      />
    );
  }
  return (
    <>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Browse by jurisdiction
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaries.map((s) => (
          <JurisdictionTile key={s.jurisdiction_code} summary={s} />
        ))}
      </div>
    </>
  );
}

function ResultList({
  items,
  filters,
}: {
  items: Awaited<ReturnType<typeof listRegulations>>;
  filters: BrowseFiltersInput;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No regulations match these filters."
        description={
          filters.q
            ? `Try a broader search than "${filters.q}", or clear a facet from the sidebar.`
            : "Try clearing the most restrictive facet, or widen the date range."
        }
      />
    );
  }
  return (
    <>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Showing {items.length} {items.length === 1 ? "regulation" : "regulations"}
        {filters.q && (
          <>
            {" "}for <span className="text-foreground">&ldquo;{filters.q}&rdquo;</span>
          </>
        )}
      </p>
      <div className="overflow-hidden rounded-xl border border-card-border bg-background">
        {items.map((item) => (
          <RegulationRow key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
