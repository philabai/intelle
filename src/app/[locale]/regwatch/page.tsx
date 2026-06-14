import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { listRegulators } from "@/lib/regwatch/queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return {
    title: t("landing.title"),
    description: t("landing.description"),
  };
}
export const dynamic = "force-dynamic";

const REGION_ORDER = ["na", "eu", "uk", "mea", "int"] as const;

export default async function RegwatchLanding() {
  const t = await getTranslations("regwatch.discover");
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    regulators,
  ] = await Promise.all([supabase.auth.getUser(), listRegulators()]);

  const totalRegulators = regulators.length;
  const totalItems = regulators.reduce((a, r) => a + r.item_count, 0);
  const totalRecent = regulators.reduce((a, r) => a + r.recent_item_count, 0);

  // Group for the preview strip.
  const byRegion = new Map<string, typeof regulators>();
  for (const r of regulators) {
    if (!byRegion.has(r.region)) byRegion.set(r.region, []);
    byRegion.get(r.region)!.push(r);
  }

  return (
    <RegwatchAppShell authed={!!user}>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <span className="inline-block rounded-full border border-brand-teal/40 bg-brand-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("landingEyebrow")}
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {t.rich("landingHeading", {
              highlight: (chunks) => (
                <span className="gradient-text">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            {t("landingSubheading", { count: totalRegulators })}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/regwatch/signup"
              className="rounded-md bg-brand-blue px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue/90"
            >
              {t("landingStartFree")}
            </Link>
            <Link
              href="/regwatch/browse"
              className="rounded-md border border-card-border bg-card-bg px-5 py-3 text-sm font-medium text-foreground hover:border-brand-teal"
            >
              {t("browseRegulations")}
            </Link>
            <Link
              href="/regwatch/regulators"
              className="rounded-md border border-card-border bg-card-bg px-5 py-3 text-sm font-medium text-foreground hover:border-brand-teal"
            >
              {t("seeAllRegulators", { count: totalRegulators })}
            </Link>
          </div>
        </div>
      </section>

      {/* Live corpus stats + per-region regulator preview ---------------- */}
      <section className="border-t border-card-border bg-card-bg/20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t("statRegulatorsMonitored")} value={totalRegulators} />
            <Stat label={t("statRegulationsTracked")} value={totalItems} />
            <Stat
              label={t("statUpdatedLast30")}
              value={totalRecent}
              accent
            />
          </div>

          <div className="mt-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-brand-teal">
                {t("coverageByRegion")}
              </h2>
              <Link
                href="/regwatch/regulators"
                className="text-xs text-muted hover:text-foreground"
              >
                {t("fullList")}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {REGION_ORDER.map((region) => {
                const rows = byRegion.get(region) ?? [];
                if (rows.length === 0) return null;
                const totalItemsRegion = rows.reduce(
                  (a, r) => a + r.item_count,
                  0,
                );
                const top = rows
                  .slice()
                  .sort((a, b) => b.item_count - a.item_count)
                  .slice(0, 4);
                return (
                  <div
                    key={region}
                    className="rounded-xl border border-card-border bg-background p-4"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                      {t(`region.${region}`)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {t("regulatorsItemsCount", {
                        regulators: rows.length,
                        items: totalItemsRegion,
                      })}
                    </p>
                    <ul className="mt-3 space-y-1 text-xs">
                      {top.map((r) => (
                        <li key={r.slug}>
                          <Link
                            href={`/regwatch/regulator/${r.slug}`}
                            className="text-muted hover:text-brand-teal"
                          >
                            {r.short_name ?? r.name}
                            <span className="ms-1 font-mono text-[10px] text-muted/70">
                              {r.item_count}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {rows.length > 4 && (
                        <li className="text-[10px] text-muted/70">
                          {t("plusMore", { count: rows.length - 4 })}
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </RegwatchAppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-background p-5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${
          accent ? "text-brand-teal" : "text-foreground"
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
