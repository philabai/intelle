import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
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
  const t = useTranslations("regwatch.comply");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/settings/footprint");

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
            {t("breadcrumbMyFeed")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t("footprintTitle")}</span>
        </nav>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? t("yourFootprint")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("footprintHeading")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t("footprintSubheading")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-end">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {t("roleLabel")}
            </span>
            <span className="text-sm text-foreground">
              {roleLabel(initialRole)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {footprint?.is_configured ? t("configured") : t("notYetConfigured")}
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
          submitLabel={t("footprintSaveSubmit")}
          redirectTo="/regwatch/feed"
        />
      </div>
    </RegwatchAppShell>
  );
}
