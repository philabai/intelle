import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getJurisdictionSummaries, listRegulations } from "@/lib/regwatch/queries";
import {
  getJurisdictionHierarchy,
  countRecentJurisdictionUpdates,
} from "@/lib/regwatch/regulatory-sections";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { HierarchyTree } from "@/components/regwatch/browse/HierarchyTree";
import { RegulationRow } from "@/components/regwatch/RegulationRow";

interface Props {
  params: Promise<{ jurisdiction: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jurisdiction } = await params;
  const code = jurisdiction.toUpperCase();
  const summaries = await getJurisdictionSummaries();
  const summary = summaries.find((s) => s.jurisdiction_code === code);
  return {
    title: summary
      ? `${summary.jurisdiction_name} — Vantage`
      : "Jurisdiction — Vantage",
    description: summary
      ? `Browse ${summary.jurisdiction_name} regulations by hierarchy — ${summary.item_count} items from ${summary.regulator_count} publishers.`
      : undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function DiscoverJurisdictionBrowsePage({ params }: Props) {
  const { jurisdiction } = await params;
  const code = jurisdiction.toUpperCase();

  const supabase = await createClient();
  const [{ data: { user } }, summaries, hierarchyRoots, recentTotal, fallbackItems] =
    await Promise.all([
      supabase.auth.getUser(),
      getJurisdictionSummaries(),
      getJurisdictionHierarchy(code),
      countRecentJurisdictionUpdates(code),
      // Fallback flat list for publishers without a hierarchy adapter yet —
      // we still surface their regulations as a single virtual root.
      listRegulations({ jurisdiction: code }, 500),
    ]);

  const summary = summaries.find((s) => s.jurisdiction_code === code);
  if (!summary) notFound();

  const hasHierarchy = hierarchyRoots.length > 0;

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/discover" className="hover:text-foreground">
              Discover
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{summary.jurisdiction_name}</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
                Jurisdiction · {code}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {summary.jurisdiction_name}
              </h1>
            </div>
            <div className="text-right text-xs text-muted">
              <p>
                {Number(summary.regulator_count).toLocaleString()} publishers ·{" "}
                {Number(summary.item_count).toLocaleString()} regulations
              </p>
              {recentTotal > 0 && (
                <p className="mt-1 text-amber-300">
                  {recentTotal.toLocaleString()} hierarchy nodes touched in the
                  last 30 days
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {hasHierarchy ? (
          <HierarchyTree roots={hierarchyRoots} jurisdictionCode={code} />
        ) : (
          <FlatFallback items={fallbackItems} jurisdictionCode={code} />
        )}
      </div>
    </RegwatchAppShell>
  );
}

function FlatFallback({
  items,
  jurisdictionCode,
}: {
  items: Awaited<ReturnType<typeof listRegulations>>;
  jurisdictionCode: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-xs text-muted">
        No regulations have been ingested for {jurisdictionCode} yet.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4 rounded-md border border-card-border bg-card-bg/30 p-3 text-[11px] text-muted">
        No publisher hierarchy ingested for this jurisdiction yet. Showing{" "}
        {items.length} regulations as a flat list — the eCFR-style tree will
        light up once a hierarchy adapter ships for this jurisdiction's
        publishers.
      </div>
      <div className="overflow-hidden rounded-xl border border-card-border bg-background">
        {items.map((item) => (
          <RegulationRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
