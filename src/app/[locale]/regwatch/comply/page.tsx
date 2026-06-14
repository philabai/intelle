import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return {
    title: t("comply.title"),
    description: t("comply.description"),
  };
}
export const dynamic = "force-dynamic";

/**
 * Comply hub landing — Reviewer Inbox first (the most-used daily
 * surface for compliance teams), with quick-links into the rest of
 * the cluster underneath. Footprint moves here from Settings because
 * it's a Comply input, not an account knob.
 */
export default async function ComplyHub() {
  const t = await getTranslations("regwatch.comply");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/comply");

  const TILES: { href: string; title: string; description: string; icon: string }[] = [
    {
      href: "/regwatch/comply/inbox",
      title: t("hubInboxTitle"),
      description: t("hubInboxDescription"),
      icon: "📥",
    },
    {
      href: "/regwatch/obligations",
      title: t("hubObligationsTitle"),
      description: t("hubObligationsDescription"),
      icon: "✅",
    },
    {
      href: "/regwatch/assets",
      title: t("hubAssetsTitle"),
      description: t("hubAssetsDescription"),
      icon: "🏭",
    },
    {
      href: "/regwatch/settings/footprint",
      title: t("hubFootprintTitle"),
      description: t("hubFootprintDescription"),
      icon: "🗺️",
    },
    {
      href: "/regwatch/onboarding",
      title: t("hubCheckupTitle"),
      description: t("hubCheckupDescription"),
      icon: "🩺",
    },
  ];

  return (
    <RegwatchAppShell authed>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("hubEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("hubHeading")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            {t("hubSubheading")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group block rounded-xl border border-card-border bg-card-bg/40 p-5 transition hover:border-brand-blue/60 hover:bg-card-bg/60"
            >
              <p className="text-2xl">{tile.icon}</p>
              <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-brand-teal">
                {tile.title}
              </h3>
              <p className="mt-1 text-xs text-muted">{tile.description}</p>
              <p className="mt-3 text-[11px] text-brand-blue opacity-0 transition group-hover:opacity-100">
                {t("hubTileOpen")}
              </p>
            </Link>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-card-border bg-card-bg/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("hubAdminToolsLabel")}
          </p>
          <Link
            href="/regwatch/admin/connectors"
            className="mt-2 inline-flex items-center gap-2 text-sm text-brand-teal hover:underline"
          >
            {t("hubConnectorRunnerLink")}
          </Link>
          <p className="mt-1 text-[11px] text-muted">
            {t("hubConnectorRunnerDescription")}
          </p>
        </section>
      </div>
    </RegwatchAppShell>
  );
}
