import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyFootprint, getMyOrganization } from "@/lib/regwatch/footprint";
import { listMonitorableRegulators } from "@/lib/regwatch/footprint-actions";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { FootprintForm } from "@/components/regwatch/footprint/FootprintForm";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return { title: t("onboarding.title") };
}
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const t = await getTranslations("regwatch.onboarding");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/onboarding");

  const gate = await checkFeatureGate("footprint");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="footprint"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
          extra={t("paywallExtra")}
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
            {org?.organization.name
              ? t("welcomeTo", { org: org.organization.name })
              : t("welcome")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {t.rich("intro", {
              footprintLink: (chunks) => (
                <Link
                  href="/regwatch/settings/footprint"
                  className="text-brand-teal hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
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
          submitLabel={t("submitLabel")}
          redirectTo="/regwatch/feed"
        />

        <p className="mt-6 text-center text-xs text-muted">
          {t.rich("explore", {
            browseLink: (chunks) => (
              <Link
                href="/regwatch/browse"
                className="text-foreground hover:underline"
              >
                {chunks}
              </Link>
            ),
            feedLink: (chunks) => (
              <Link
                href="/regwatch/feed"
                className="text-foreground hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </RegwatchAppShell>
  );
}
