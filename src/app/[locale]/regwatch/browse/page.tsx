import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getJurisdictionSummaries,
  listRegulations,
  countRegulations,
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
  const t = await getTranslations("regwatch.discover");
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

  const PAGE_SIZE = 50;
  const pageParam = parseInt(pickFilter(raw, "page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [summaries, regulators, items, totalCount] = await Promise.all([
    getJurisdictionSummaries(),
    listRegulators(),
    hasActiveFilters
      ? listRegulations(filters, PAGE_SIZE, offset)
      : Promise.resolve([]),
    hasActiveFilters ? countRegulations(filters) : Promise.resolve(0),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) {
      if (k === "page" || v == null) continue;
      sp.set(k, Array.isArray(v) ? (v[0] ?? "") : v);
    }
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return `/regwatch/browse${qs ? `?${qs}` : ""}`;
  };

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
            {t("browseEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("browseHeading", {
              items: totalItems.toLocaleString(),
              regulators: totalRegulators.toLocaleString(),
            })}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t("browseSubheading", { recent: totalRecent.toLocaleString() })}
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
            <ResultList
              items={items}
              filters={filters}
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              totalPages={totalPages}
              pageHref={pageHref}
            />
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
  const t = useTranslations("regwatch.discover");
  if (summaries.length === 0) {
    return (
      <EmptyState
        title={t("corpusEmptyTitle")}
        description={t("corpusEmptyDescription")}
      />
    );
  }
  return (
    <>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        {t("browseByJurisdiction")}
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
  page,
  pageSize,
  totalCount,
  totalPages,
  pageHref,
}: {
  items: Awaited<ReturnType<typeof listRegulations>>;
  filters: BrowseFiltersInput;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  pageHref: (n: number) => string;
}) {
  const t = useTranslations("regwatch.discover");
  if (items.length === 0) {
    return (
      <EmptyState
        title={t("noMatchTitle")}
        description={
          filters.q
            ? t("noMatchWithQuery", { q: filters.q })
            : t("noMatchDescription")
        }
      />
    );
  }
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = (page - 1) * pageSize + items.length;
  return (
    <>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        {t.rich("showingRange", {
          start: rangeStart.toLocaleString(),
          end: rangeEnd.toLocaleString(),
          count: totalCount,
          total: totalCount.toLocaleString(),
          hasQuery: filters.q ? "yes" : "no",
          q: filters.q ?? "",
          highlight: (chunks) => (
            <span className="text-foreground">{chunks}</span>
          ),
        })}
      </p>
      <div className="overflow-hidden rounded-xl border border-card-border bg-background">
        {items.map((item) => (
          <RegulationRow key={item.id} item={item} />
        ))}
      </div>
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-md border border-card-border px-3 py-1.5 text-muted hover:text-foreground"
            >
              {t("previous")}
            </Link>
          ) : (
            <span className="rounded-md border border-card-border/40 px-3 py-1.5 text-muted/40">
              {t("previous")}
            </span>
          )}
          <span className="text-xs text-muted">
            {t("pageOf", {
              page: page.toLocaleString(),
              total: totalPages.toLocaleString(),
            })}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-md border border-card-border px-3 py-1.5 text-muted hover:text-foreground"
            >
              {t("next")}
            </Link>
          ) : (
            <span className="rounded-md border border-card-border/40 px-3 py-1.5 text-muted/40">
              {t("next")}
            </span>
          )}
        </nav>
      )}
    </>
  );
}
