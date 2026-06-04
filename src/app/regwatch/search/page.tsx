import { Suspense } from "react";
import { createClient } from "@/lib/regwatch/supabase/server";
import { listRegulations } from "@/lib/regwatch/queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { SearchInput } from "@/components/regwatch/search/SearchInput";
import { IrisAnswer } from "@/components/regwatch/search/IrisAnswer";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = query ? await listRegulations({ q: query }, 25) : [];

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
            list below is the same Postgres FTS the Browser uses. Semantic vector search
            joins this surface when Phase 1.3 enrichment populates embeddings.
          </p>
        </header>

        <div className="mt-8">
          <Suspense fallback={null}>
            <SearchInput initialQuery={query} />
          </Suspense>
        </div>

        {!query ? (
          <div className="mt-12">
            <EmptyState
              title="Ask Iris anything about the corpus."
              description="Compliance-grade answers, citation-anchored to the regulation. Click any sample query above to see it in action."
            />
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            <Suspense
              fallback={
                <div className="h-32 animate-pulse rounded-xl bg-card-bg" />
              }
            >
              <IrisAnswer key={query} query={query} />
            </Suspense>

            <section>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                {items.length} keyword {items.length === 1 ? "match" : "matches"} in the
                corpus
              </p>
              {items.length === 0 ? (
                <EmptyState
                  title="No corpus rows matched your keywords."
                  description="Iris may still be able to answer from related items — see the synthesis above. Try a broader query or check the Browse page for jurisdiction-level coverage."
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
