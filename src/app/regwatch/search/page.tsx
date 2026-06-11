import { Suspense } from "react";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  listRegulationsHybrid,
  listRegulatorOptions,
  type HybridSearchFilters,
} from "@/lib/regwatch/queries";
import {
  parseSources,
  instrumentTypesForSources,
} from "@/lib/regwatch/taxonomy";
import { isSavedQuery } from "@/lib/regwatch/saved-searches";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { SearchControls } from "@/components/regwatch/search/SearchControls";
import { IrisAnswer } from "@/components/regwatch/search/IrisAnswer";
import { SaveSearchButton } from "@/components/regwatch/search/SaveSearchButton";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { EmptyState } from "@/components/regwatch/EmptyState";

export const metadata = { title: "Search" };
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

export default async function SearchPage({ searchParams }: Props) {
  const raw = await searchParams;
  const query = pickFilter(raw, "q") ?? "";

  // Source picker (Regulations / Policies / News) → instrument_type allow-list,
  // intersected with the optional fine-grained instrument_type facet.
  const sources = parseSources(pickFilter(raw, "sources"));
  const fineInstrumentType = pickFilter(raw, "instrument_type");
  let instrumentTypes = instrumentTypesForSources(sources);
  if (fineInstrumentType) {
    instrumentTypes = instrumentTypes.filter((t) => t === fineInstrumentType);
  }
  const filters: HybridSearchFilters = {
    instrumentTypes,
    regulator: pickFilter(raw, "regulator"),
    topic: pickFilter(raw, "topic"),
    status: pickFilter(raw, "status"),
  };
  // Re-run Iris when the query OR any filter changes (forces remount).
  const filterKey = `${instrumentTypes.join(",")}|${filters.regulator ?? ""}|${filters.topic ?? ""}|${filters.status ?? ""}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Regulators load always (the source/facet controls are always shown).
  const [regulators, items, alreadySaved] = await Promise.all([
    listRegulatorOptions(),
    query ? listRegulationsHybrid(query, 25, filters) : Promise.resolve([]),
    query ? isSavedQuery(query) : Promise.resolve(false),
  ]);

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Search the corpus
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Keyword + Iris Q&amp;A in one input
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Type a question, paste a legal citation, or run a keyword search. Iris
            synthesises a grounded answer from the matching corpus excerpts; the ranked
            list below is hybrid retrieval — voyage-3-large vector similarity blended
            with Postgres FTS, so paraphrases (&ldquo;ammonia&rdquo; finds &ldquo;NH3&rdquo;) surface alongside
            exact-keyword matches.
          </p>
        </header>

        <div className="mt-8">
          <Suspense fallback={null}>
            <SearchControls regulators={regulators} initialQuery={query} />
          </Suspense>
          {query && (
            <div className="mt-3 flex items-center justify-end">
              <SaveSearchButton
                query={query}
                resultCount={items.length}
                alreadySaved={alreadySaved}
                authed={!!user}
              />
            </div>
          )}
        </div>

        {!query ? (
          <div className="mt-12">
            <EmptyState
              title="Ask Iris anything about the corpus."
              description="Compliance-grade answers, citation-anchored to the regulation. Choose your sources above, then click any sample query to see it in action."
            />
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            <Suspense
              fallback={<div className="h-32 animate-pulse rounded-xl bg-card-bg" />}
            >
              <IrisAnswer key={`${query}|${filterKey}`} query={query} filters={filters} />
            </Suspense>

            <section>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                {items.length} hybrid {items.length === 1 ? "match" : "matches"} in the
                corpus
              </p>
              {items.length === 0 ? (
                <EmptyState
                  title="No corpus rows matched your keywords."
                  description="Iris may still be able to answer from related items — see the synthesis above. Try a broader query, add a source in the picker, or check the Browse page for jurisdiction-level coverage."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-card-border bg-background">
                  {items.map((item) => (
                    <RegulationRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </RegwatchAppShell>
  );
}
