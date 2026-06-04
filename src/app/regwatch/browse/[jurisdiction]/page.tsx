import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getJurisdictionSummaries,
  listRegulations,
  type BrowseFilters as BrowseFiltersInput,
} from "@/lib/regwatch/queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { BrowseFilters } from "@/components/regwatch/BrowseFilters";
import { BrowseSearchInput } from "@/components/regwatch/BrowseSearchInput";
import { EmptyState } from "@/components/regwatch/EmptyState";

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
  ] = await Promise.all([supabase.auth.getUser(), getJurisdictionSummaries()]);

  const summary = summaries.find((s) => s.jurisdiction_code === jurisdictionCode);
  if (!summary) notFound();

  const filters: BrowseFiltersInput = {
    jurisdiction: jurisdictionCode,
    topic: pickFilter(raw, "topic"),
    instrument_type: pickFilter(raw, "instrument_type"),
    status: pickFilter(raw, "status"),
    q: pickFilter(raw, "q"),
  };

  const items = await listRegulations(filters, 100);

  const jurisdictionOptions = summaries.map((s) => ({
    code: s.jurisdiction_code,
    name: s.jurisdiction_name,
    count: Number(s.item_count),
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
    </RegwatchAppShell>
  );
}
