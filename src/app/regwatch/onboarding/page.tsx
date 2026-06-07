import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyFootprint, getMyOrganization } from "@/lib/regwatch/footprint";
import { listMonitorableRegulators } from "@/lib/regwatch/footprint-actions";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { FootprintForm } from "@/components/regwatch/footprint/FootprintForm";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";

export const metadata = { title: "Welcome to Vantage" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/onboarding");

  const gate = await checkFeatureGate("footprint");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="footprint"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
          extra="Onboarding lives inside the footprint configurator, which is Pro+ only. Sign up for free, upgrade when you're ready to set up your footprint."
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
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Welcome{org?.organization.name ? ` to ${org.organization.name}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Configure your operations footprint
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Tells Vantage which jurisdictions, activities, and topics to prioritise. Pick
            as much or as little as you want — you can always refine it later from{" "}
            <Link
              href="/regwatch/settings/footprint"
              className="text-brand-teal hover:underline"
            >
              Settings &rarr; Footprint
            </Link>
            . The defaults are intentionally empty so you don't get scored against
            assumptions you didn't make.
          </p>
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

        <p className="mt-6 text-center text-xs text-muted">
          Want to explore first?{" "}
          <Link href="/regwatch/browse" className="text-foreground hover:underline">
            Browse the corpus
          </Link>{" "}
          or{" "}
          <Link href="/regwatch/feed" className="text-foreground hover:underline">
            skip to the Feed
          </Link>{" "}
          — your footprint can stay empty until you're ready.
        </p>
      </div>
    </RegwatchAppShell>
  );
}
