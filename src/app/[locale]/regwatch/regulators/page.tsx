import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { listRegulators } from "@/lib/regwatch/queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegulatorCard } from "@/components/regwatch/RegulatorCard";

export const metadata = {
  title: "Regulators",
  description:
    "Every regulator Vantage by intelle.io monitors — grouped by region with item counts and recent activity.",
};
export const dynamic = "force-dynamic";

const REGION_ORDER = ["na", "eu", "uk", "mea", "asia", "lac", "int"] as const;
const REGION_LABEL: Record<string, string> = {
  na: "North America",
  eu: "European Union",
  uk: "United Kingdom",
  mea: "Middle East & Africa",
  asia: "Asia & Pacific",
  lac: "Latin America & Caribbean",
  int: "International",
};

export default async function RegulatorsIndexPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    regulators,
  ] = await Promise.all([supabase.auth.getUser(), listRegulators()]);

  // Group by region for display.
  const byRegion = new Map<string, typeof regulators>();
  for (const r of regulators) {
    if (!byRegion.has(r.region)) byRegion.set(r.region, []);
    byRegion.get(r.region)!.push(r);
  }

  const totalRegulators = regulators.length;
  const totalItems = regulators.reduce((a, r) => a + r.item_count, 0);

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Monitored regulators
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {totalRegulators} regulators · {totalItems.toLocaleString()}{" "}
            regulations
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Every regulator Vantage monitors today, grouped by region. Click a
            card for the full per-regulator feed of items. Public corpus — no
            signup required to read.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {REGION_ORDER.map((region) => {
          const rows = byRegion.get(region);
          if (!rows || rows.length === 0) return null;
          return (
            <section key={region} className="mb-12">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {REGION_LABEL[region] ?? region}
                </h2>
                <p className="text-xs text-muted">
                  {rows.length}{" "}
                  {rows.length === 1 ? "regulator" : "regulators"} ·{" "}
                  {rows.reduce((a, r) => a + r.item_count, 0)} items
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => (
                  <RegulatorCard key={r.slug} regulator={r} />
                ))}
              </div>
            </section>
          );
        })}

        <p className="mt-12 text-center text-xs text-muted">
          Want a regulator we&apos;re not monitoring yet?{" "}
          <Link
            href="/contact?service_interest=regwatch-coverage"
            className="text-brand-teal hover:underline"
          >
            Tell us
          </Link>{" "}
          — most are a single connector away.
        </p>
      </div>
    </RegwatchAppShell>
  );
}
