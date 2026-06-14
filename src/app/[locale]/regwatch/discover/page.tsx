import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getJurisdictionSummaries } from "@/lib/regwatch/queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { JurisdictionCard } from "@/components/regwatch/discover/JurisdictionCard";

export const metadata: Metadata = {
  title: "Discover — Vantage",
  description:
    "Browse every regulation in the Vantage corpus by jurisdiction. eCFR-style hierarchical navigation with recent-update markers.",
};
export const dynamic = "force-dynamic";

/**
 * Discover landing — the public-facing front door for the corpus.
 * Renders a grid of jurisdiction cards, each linking to the new
 * hierarchical browse view. Featured jurisdictions (Saudi when SASO
 * lands, US/EU year-round) sit at the top with brand accents.
 */
export default async function DiscoverLandingPage() {
  const t = await getTranslations("regwatch.discover");
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    summaries,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getJurisdictionSummaries(),
  ]);

  const FEATURED_CODES = new Set(["CA", "US", "EU", "GB", "SA"]);
  // Explicit display order for the featured row — Canada sits first.
  const FEATURED_ORDER = ["CA", "US", "EU", "GB", "SA"];
  const featured = summaries
    .filter((s) => FEATURED_CODES.has(s.jurisdiction_code))
    .sort(
      (a, b) =>
        FEATURED_ORDER.indexOf(a.jurisdiction_code) -
        FEATURED_ORDER.indexOf(b.jurisdiction_code),
    );
  const rest = summaries
    .filter((s) => !FEATURED_CODES.has(s.jurisdiction_code))
    .sort((a, b) => Number(b.item_count) - Number(a.item_count));

  const ACCENT: Record<string, string> = {
    CA: "#d52b1e",
    US: "#1e3a8a",
    EU: "#0033a0",
    GB: "#c8102e",
    SA: "#006c35",
  };

  const totalItems = summaries.reduce((a, s) => a + Number(s.item_count), 0);
  const totalRecent = summaries.reduce(
    (a, s) => a + Number(s.recent_item_count),
    0,
  );

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading", {
              total: totalItems.toLocaleString(),
              recent: totalRecent.toLocaleString(),
            })}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            {t("subheading")}
          </p>
          <div className="mt-4 flex gap-3 text-xs">
            <Link
              href="/regwatch/regulators"
              className="rounded-md border border-card-border px-3 py-1.5 text-foreground hover:border-brand-blue"
            >
              {t("allRegulators")}
            </Link>
            <Link
              href="/regwatch/topics"
              className="rounded-md border border-card-border px-3 py-1.5 text-foreground hover:border-brand-blue"
            >
              {t("allTopics")}
            </Link>
            <Link
              href="/regwatch/search"
              className="rounded-md border border-card-border px-3 py-1.5 text-foreground hover:border-brand-blue"
            >
              {t("searchLink")}
            </Link>
            <Link
              href="/regwatch/tutorials"
              className="rounded-md border border-brand-teal/40 bg-brand-teal/10 px-3 py-1.5 text-brand-teal hover:border-brand-teal"
            >
              {t("watchTutorials")}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {featured.length > 0 && (
          <section className="mb-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
              {t("featuredJurisdictions")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featured.map((s) => (
                <JurisdictionCard
                  key={s.jurisdiction_code}
                  jurisdictionCode={s.jurisdiction_code}
                  jurisdictionName={s.jurisdiction_name}
                  publisherCount={Number(s.regulator_count)}
                  itemCount={Number(s.item_count)}
                  recentCount={Number(s.recent_item_count)}
                  accentColor={ACCENT[s.jurisdiction_code]}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
            {t("allJurisdictions")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((s) => (
              <JurisdictionCard
                key={s.jurisdiction_code}
                jurisdictionCode={s.jurisdiction_code}
                jurisdictionName={s.jurisdiction_name}
                publisherCount={Number(s.regulator_count)}
                itemCount={Number(s.item_count)}
                recentCount={Number(s.recent_item_count)}
              />
            ))}
          </div>
        </section>
      </div>
    </RegwatchAppShell>
  );
}
