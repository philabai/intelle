import { Suspense } from "react";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  listRegulationsHybrid,
  listRegulatorOptions,
  type HybridSearchFilters,
} from "@/lib/regwatch/queries";
import {
  parseSources,
  parseCsv,
  instrumentTypesForSources,
} from "@/lib/regwatch/taxonomy";
import { isSavedQuery } from "@/lib/regwatch/saved-searches";
import {
  listFolders,
  buildFolderTree,
  countUnfiledDocuments,
} from "@/lib/regwatch/document-folders";
import {
  searchInternalDocuments,
  type CompanyDocResult,
} from "@/lib/regwatch/internal-document-search";
import { UNFILED_TOKEN } from "@/components/regwatch/search/FolderPicker";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { SearchControls } from "@/components/regwatch/search/SearchControls";
import { SearchExperience } from "@/components/regwatch/search/SearchExperience";
import { SaveSearchButton } from "@/components/regwatch/search/SaveSearchButton";
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
  // intersected with the multi-select instrument_type facet.
  //
  // Filter semantics: an EMPTY source selection means "no restriction" (search
  // every source), NOT "match nothing". A non-empty selection restricts to those
  // sources. (Absent param defaults to Regulations-only — see parseSources.)
  const sources = parseSources(pickFilter(raw, "sources"));
  const fineInstrumentTypes = parseCsv(pickFilter(raw, "instrument_type"));
  const sourceTypes = sources.length === 0 ? null : instrumentTypesForSources(sources);
  let instrumentTypes: string[] | undefined;
  if (fineInstrumentTypes.length) {
    // Fine instrument-type facet ANDs with the source bucket (intersection).
    instrumentTypes = sourceTypes
      ? sourceTypes.filter((t) => fineInstrumentTypes.includes(t))
      : fineInstrumentTypes;
  } else {
    // null source bucket (empty selection) → undefined = no instrument_type filter.
    instrumentTypes = sourceTypes ?? undefined;
  }
  const selRegulators = parseCsv(pickFilter(raw, "regulator"));
  const selTopics = parseCsv(pickFilter(raw, "topic"));
  const selStatuses = parseCsv(pickFilter(raw, "status"));
  const filters: HybridSearchFilters = {
    instrumentTypes,
    regulators: selRegulators.length ? selRegulators : undefined,
    topics: selTopics.length ? selTopics : undefined,
    statuses: selStatuses.length ? selStatuses : undefined,
  };

  // Company Docs source (internal documents). `docfolders` carries the picked
  // folder ids plus the "unfiled" token; no selection = all company docs.
  const docsOn = pickFilter(raw, "docs") === "1";
  const docFolderSel = parseCsv(pickFilter(raw, "docfolders"));
  const docFolderIds = docFolderSel.filter((x) => x !== UNFILED_TOKEN);
  const includeUnfiled = docFolderSel.includes(UNFILED_TOKEN);

  // Captured into a saved search (and used to re-run it). The raw URL param
  // values, minus the query itself.
  const activeFilterParams: Record<string, string> = {};
  for (const k of [
    "sources",
    "regulator",
    "topic",
    "instrument_type",
    "status",
    "docs",
    "docfolders",
  ]) {
    const v = pickFilter(raw, k);
    if (v) activeFilterParams[k] = v;
  }
  // Signature that changes when the query OR any filter changes (forces the
  // controls + Iris to remount/re-run on external navigation).
  const filterKey = `${(instrumentTypes ?? ["all"]).join(",")}|${selRegulators.join(",")}|${selTopics.join(",")}|${selStatuses.join(",")}|${docsOn ? "docs" : ""}:${docFolderSel.join(",")}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  // Regulators + folder tree load always (the controls are always shown to
  // authed users). The doc search only runs when Company Docs is on.
  const [regulators, items, alreadySaved, folders, unfiledCount, docResults] =
    await Promise.all([
      listRegulatorOptions(),
      query ? listRegulationsHybrid(query, 25, filters) : Promise.resolve([]),
      query ? isSavedQuery(query) : Promise.resolve(false),
      authed ? listFolders() : Promise.resolve([]),
      authed ? countUnfiledDocuments() : Promise.resolve(0),
      query && authed && docsOn
        ? searchInternalDocuments(query, {
            folderIds: docFolderIds,
            includeUnfiled,
          })
        : Promise.resolve([] as CompanyDocResult[]),
    ]);
  const folderTree = buildFolderTree(folders);

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
            <SearchControls
              key={`${query}|${filterKey}`}
              regulators={regulators}
              initialQuery={query}
              authed={authed}
              folderTree={folderTree}
              unfiledCount={unfiledCount}
            />
          </Suspense>
          {query && (
            <div className="mt-3 flex items-center justify-end">
              <SaveSearchButton
                query={query}
                filters={activeFilterParams}
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
          <div className="mt-8">
            <SearchExperience
              key={`${query}|${filterKey}`}
              query={query}
              filters={filters}
              docScope={
                authed && docsOn
                  ? { folderIds: docFolderIds, includeUnfiled }
                  : undefined
              }
              regulations={items}
              companyDocs={docResults}
              docsOn={docsOn}
            />
          </div>
        )}
      </div>
    </RegwatchAppShell>
  );
}
