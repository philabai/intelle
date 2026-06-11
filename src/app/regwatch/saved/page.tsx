import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { listMySavedSearches } from "@/lib/regwatch/saved-searches";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { SavedSearchRow } from "@/components/regwatch/saved/SavedSearchRow";

export const metadata: Metadata = {
  title: "My Vantage · Saved searches",
  description:
    "Saved corpus queries. Click any saved search to re-run it on the current corpus.",
};
export const dynamic = "force-dynamic";

/**
 * Saved searches surface — replaces the prior coming-soon shell.
 * v1 covers saved corpus queries; future iterations can fold in
 * saved regulations, saved Feed views, and past briefings (the
 * original "My RegWatch" Phase-1 plan).
 */
export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/saved");

  const searches = await listMySavedSearches();

  return (
    <RegwatchAppShell authed>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/monitor/today" className="hover:text-foreground">
              Monitor
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Saved</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            My Vantage
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Saved corpus queries. Click <strong>Run</strong> on any row to
            re-run the search on the current corpus state.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Saved searches
            </h2>
            <span className="rounded-full border border-card-border bg-card-bg/60 px-2 py-0.5 text-[10px] font-medium text-muted">
              {searches.length}
            </span>
          </div>

          {searches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-xs text-muted">
              <p>
                No saved searches yet. Run a query on the{" "}
                <Link
                  href="/regwatch/search"
                  className="font-medium text-brand-teal hover:underline"
                >
                  Search page
                </Link>{" "}
                and click <strong>★ Save this search</strong>.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {searches.map((s) => (
                <SavedSearchRow
                  key={s.id}
                  id={s.id}
                  query={s.query}
                  label={s.label}
                  filters={s.filters}
                  resultCountAtSave={s.resultCountAtSave}
                  createdAt={s.createdAt}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-dashed border-card-border bg-card-bg/30 p-5">
          <p className="text-xs font-medium text-foreground">Coming soon</p>
          <p className="mt-1 text-[11px] text-muted">
            Saved regulations · Saved Feed views · Past impact briefings. Each
            will roll up into the same My Vantage hub.
          </p>
        </section>
      </div>
    </RegwatchAppShell>
  );
}
