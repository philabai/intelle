import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyFootprint, getMyOrganization } from "@/lib/regwatch/footprint";
import { listMonitorableRegulators } from "@/lib/regwatch/footprint-actions";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { FootprintForm } from "@/components/regwatch/footprint/FootprintForm";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { roleLabel } from "@/lib/regwatch/reference/roles";

export const metadata = { title: "Footprint" };
export const dynamic = "force-dynamic";

export default async function FootprintSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/settings/footprint");

  const gate = await checkFeatureGate("footprint");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="footprint"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
        />
      </RegwatchAppShell>
    );
  }

  const [org, footprint, regulators] = await Promise.all([
    getMyOrganization(),
    getMyFootprint(),
    listMonitorableRegulators(),
  ]);

  const initialRole =
    (user.user_metadata?.functional_role as string | undefined) ?? "";

  const initialFootprint = footprint
    ? {
        geographies: footprint.geographies,
        activities_naics: footprint.activities_naics,
        substances_cas: footprint.substances_cas,
        monitored_regulator_slugs: footprint.monitored_regulator_slugs,
        monitored_topics: footprint.monitored_topics,
      }
    : {
        geographies: [],
        activities_naics: [],
        substances_cas: [],
        monitored_regulator_slugs: [],
        monitored_topics: [],
      };

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Footprint</span>
        </nav>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? "Your footprint"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Footprint configurator
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Tells RegWatch which jurisdictions, activities, substances, regulators, and
              topics to score against. Save as often as you like — changes propagate to
              your Relevance Feed automatically.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Role
            </span>
            <span className="text-sm text-foreground">
              {roleLabel(initialRole)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {footprint?.is_configured ? "Configured" : "Not yet configured"}
            </span>
          </div>
        </header>

        <FootprintForm
          initialRole={initialRole}
          initialFootprint={initialFootprint}
          regulators={regulators.map((r) => ({
            slug: r.slug,
            name: r.name,
            short_name: r.short_name,
            jurisdiction_code:
              (r as unknown as { jurisdiction_code: string }).jurisdiction_code,
            region: (r as unknown as { region: string }).region,
          }))}
          submitLabel="Save and view my Feed →"
          redirectTo="/regwatch/feed"
        />
      </div>
    </RegwatchAppShell>
  );
}
