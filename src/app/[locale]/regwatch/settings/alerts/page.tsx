import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyAlertPrefs } from "@/lib/regwatch/alerts";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { AlertPrefsForm } from "@/components/regwatch/alerts/AlertPrefsForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return { title: t("settingsAlerts.title") };
}
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const t = await getTranslations("regwatch.monitor");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/settings/alerts");

  const initial = await getMyAlertPrefs();

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            {t("breadcrumbMyFeed")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t("breadcrumbAlerts")}</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("alertsEyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("alertsTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {t("alertsIntro")}
          </p>
        </header>

        <AlertPrefsForm
          initial={initial}
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
        />
      </div>
    </RegwatchAppShell>
  );
}
