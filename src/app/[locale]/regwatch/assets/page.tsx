import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import {
  getHierarchyConfig,
  listAssetTree,
  getAssetCounts,
  getAssetComplianceLights,
} from "@/lib/regwatch/assets";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { AssetTreeView } from "@/components/regwatch/assets/AssetTreeView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return { title: t("assets.title") };
}
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const t = await getTranslations("regwatch.comply");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/assets");

  const gate = await checkFeatureGate("compliance_obligations");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="compliance_obligations"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
        />
      </RegwatchAppShell>
    );
  }

  const org = await getMyOrganization();
  const [config, tree, counts] = await Promise.all([
    getHierarchyConfig(org?.organization.id ?? ""),
    listAssetTree(),
    getAssetCounts(),
  ]);
  const labels: Record<2 | 3 | 4 | 5 | 6, string> = {
    2: config.level2Label,
    3: config.level3Label,
    4: config.level4Label,
    5: config.level5Label,
    6: config.level6Label ?? t("levelComponentFallback"),
  };
  // Per-asset compliance traffic-light, rolled up the hierarchy.
  const lights = await getAssetComplianceLights(tree);

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            {t("breadcrumbMyFeed")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t("assetsTitle")}</span>
        </nav>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? t("yourOrganization")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("assetsHeading")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t("assetsSubheading", {
                chain: [
                  labels[2],
                  labels[3],
                  labels[4],
                  labels[5],
                  ...(config.level6Enabled ? [labels[6]] : []),
                ].join(" → "),
              })}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs uppercase tracking-wider text-muted">{t("total")}</p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              {counts.total}
            </p>
            <div className="mt-1 flex gap-3 text-[10px] uppercase tracking-wider text-muted">
              <span>
                {counts.byLevel[2]} {labels[2].toLowerCase()}
              </span>
              <span>
                {counts.byLevel[4]} {labels[4].toLowerCase()}
              </span>
              <span>{counts.byLevel[5]} {labels[5].toLowerCase()}</span>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/regwatch/assets/setup"
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            {t("editTree")}
          </Link>
          <Link
            href="/regwatch/obligations"
            className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
          >
            {t("obligationsDashboard")}
          </Link>
        </div>

        <section className="rounded-xl border border-card-border bg-card-bg/40 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
            <span className="uppercase tracking-wider">{t("compliance")}</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.75)]" />
              {t("legendNonCompliant")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.7)]" />
              {t("legendInProgress")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_7px_2px_rgba(52,211,153,0.6)]" />
              {t("legendAllAddressed")}
            </span>
            <span className="ms-auto italic">{t("legendClickHint")}</span>
          </div>
          <AssetTreeView
            roots={tree}
            levelLabels={labels}
            complianceDrawer
            complianceLightByAssetId={lights}
          />
        </section>
      </div>
    </RegwatchAppShell>
  );
}
