import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export const metadata: Metadata = {
  title: "Comply — Vantage",
  description:
    "Reviewer inbox, obligations, assets, footprint, and compliance checkup.",
};
export const dynamic = "force-dynamic";

/**
 * Comply hub landing — Reviewer Inbox first (the most-used daily
 * surface for compliance teams), with quick-links into the rest of
 * the cluster underneath. Footprint moves here from Settings because
 * it's a Comply input, not an account knob.
 */
export default async function ComplyHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/comply");

  const TILES: { href: string; title: string; description: string; icon: string }[] = [
    {
      href: "/regwatch/comply/inbox",
      title: "Reviewer Inbox",
      description:
        "Every document review + obligation review assigned to you across the org.",
      icon: "📥",
    },
    {
      href: "/regwatch/obligations",
      title: "Obligations",
      description:
        "Compliance obligations pinned to assets. Set severity, assign reviewers, capture evidence.",
      icon: "✅",
    },
    {
      href: "/regwatch/assets",
      title: "Asset hierarchy",
      description:
        "Your operations tree — Org → Division → Site → Facility → Component. Pin obligations and docs.",
      icon: "🏭",
    },
    {
      href: "/regwatch/settings/footprint",
      title: "Footprint",
      description:
        "Jurisdictions, NAICS, substances, topics — the inputs that score the Relevance Feed.",
      icon: "🗺️",
    },
    {
      href: "/regwatch/onboarding",
      title: "Compliance checkup",
      description:
        "5-question quiz that seeds a sample feed and configures your footprint. Useful for new team members.",
      icon: "🩺",
    },
  ];

  return (
    <RegwatchAppShell authed>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Comply
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your compliance cockpit
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Reviews, obligations, assets, footprint — the surfaces where
            compliance work actually happens.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group block rounded-xl border border-card-border bg-card-bg/40 p-5 transition hover:border-brand-blue/60 hover:bg-card-bg/60"
            >
              <p className="text-2xl">{t.icon}</p>
              <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-brand-teal">
                {t.title}
              </h3>
              <p className="mt-1 text-xs text-muted">{t.description}</p>
              <p className="mt-3 text-[11px] text-brand-blue opacity-0 transition group-hover:opacity-100">
                Open →
              </p>
            </Link>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-card-border bg-card-bg/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Admin tools
          </p>
          <Link
            href="/regwatch/admin/connectors"
            className="mt-2 inline-flex items-center gap-2 text-sm text-brand-teal hover:underline"
          >
            ⚙ Connector runner →
          </Link>
          <p className="mt-1 text-[11px] text-muted">
            Manually trigger any publisher connector. Useful right after
            adding a new publisher (e.g. SASO) — fills the corpus without
            waiting for the nightly cron. Owner/admin only.
          </p>
        </section>
      </div>
    </RegwatchAppShell>
  );
}
