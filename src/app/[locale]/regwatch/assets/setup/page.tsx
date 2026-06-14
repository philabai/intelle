import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { getHierarchyConfig, listAssets } from "@/lib/regwatch/assets";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { AssetTreeBuilder } from "@/components/regwatch/assets/AssetTreeBuilder";

export const metadata = { title: "Asset setup" };
export const dynamic = "force-dynamic";

export default async function AssetsSetupPage() {
  const t = useTranslations("regwatch.comply");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/assets/setup");

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

  const membership = await getMyMembership();
  const canEdit =
    membership?.role === "owner" || membership?.role === "admin";

  const org = await getMyOrganization();
  const [config, flat] = await Promise.all([
    getHierarchyConfig(org?.organization.id ?? ""),
    listAssets(),
  ]);

  const labels: Record<2 | 3 | 4 | 5 | 6, string> = {
    2: config.level2Label,
    3: config.level3Label,
    4: config.level4Label,
    5: config.level5Label,
    6: config.level6Label ?? t("levelComponentFallback"),
  };

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            {t("breadcrumbMyFeed")}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/regwatch/assets" className="hover:text-foreground">
            {t("assetsTitle")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t("setupTitle")}</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {org?.organization.name ?? t("yourOrganization")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("setupHeading")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {t("setupSubheading", {
              l2: labels[2],
              l3: labels[3],
              l4: labels[4],
              l5: labels[5],
            })}
          </p>
        </header>

        {!canEdit ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-300">
            {t.rich("setupReadOnly", {
              link: (c) => (
                <Link href="/regwatch/assets" className="underline">
                  {c}
                </Link>
              ),
            })}
          </p>
        ) : (
          <AssetTreeBuilder
            initialFlat={flat.map((a) => ({
              id: a.id,
              organizationId: a.organizationId,
              parentId: a.parentId,
              level: a.level,
              name: a.name,
              code: a.code,
              assetType: a.assetType,
              jurisdictionCode: a.jurisdictionCode,
            }))}
            levelLabels={labels}
            level6Enabled={config.level6Enabled}
            activeStarterPack={config.starterPack}
          />
        )}
      </div>
    </RegwatchAppShell>
  );
}
