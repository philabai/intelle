import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getRegulatorBySlug,
  listRegulationsByRegulator,
} from "@/lib/regwatch/queries";
import { topicLabel } from "@/lib/regwatch/taxonomy";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { EmptyState } from "@/components/regwatch/EmptyState";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  "federal-agency": "Federal agency",
  commission: "Commission",
  authority: "Authority",
  "standards-body": "Standards body",
  "international-body": "International body",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const regulator = await getRegulatorBySlug(slug);
  if (!regulator) return { title: "Regulator not found" };
  return {
    title: `${regulator.name} — Vantage`,
    description:
      regulator.description ??
      `Latest regulatory items from ${regulator.name} (${regulator.jurisdiction_name}), monitored by Vantage by intelle.io.`,
  };
}

export default async function RegulatorProfilePage({ params }: Props) {
  const t = await getTranslations("regwatch.discover");
  const { slug } = await params;
  const regulator = await getRegulatorBySlug(slug);
  if (!regulator) notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    items,
  ] = await Promise.all([
    supabase.auth.getUser(),
    listRegulationsByRegulator(slug, 100),
  ]);

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/regulators" className="hover:text-foreground">
            {t("breadcrumbRegulators")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">
            {regulator.short_name ?? regulator.name}
          </span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="rounded-md bg-brand-navy/60 px-2 py-0.5 font-medium uppercase tracking-wider">
              {regulator.jurisdiction_code}
            </span>
            <span className="text-foreground/80">
              {regulator.jurisdiction_name}
            </span>
            <span aria-hidden>·</span>
            <span>
              {TYPE_LABEL[regulator.regulator_type] ?? regulator.regulator_type}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {regulator.name}
          </h1>
          {regulator.short_name && regulator.short_name !== regulator.name && (
            <p className="mt-1 text-sm text-muted">
              {t("shortName", { name: regulator.short_name })}
            </p>
          )}
          {regulator.description && (
            <p className="mt-3 max-w-3xl text-base text-muted">
              {regulator.description}
            </p>
          )}
          {regulator.topic_domains.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {regulator.topic_domains.map((t) => (
                <Link
                  key={t}
                  href={`/regwatch/browse?topic=${encodeURIComponent(t)}`}
                  className="rounded-full border border-card-border bg-card-bg px-2 py-0.5 text-[11px] text-muted hover:border-brand-teal hover:text-brand-teal"
                >
                  {topicLabel(t)}
                </Link>
              ))}
            </div>
          )}
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label={t("itemsTracked")} value={String(regulator.item_count)} />
          <Stat
            label={t("last30Days")}
            value={String(regulator.recent_item_count)}
            accent
          />
          <div className="rounded-lg border border-card-border bg-card-bg p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {t("canonicalSite")}
            </p>
            {regulator.canonical_url ? (
              <a
                href={regulator.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block break-all text-xs text-brand-teal hover:underline"
              >
                {regulator.canonical_url.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <p className="mt-2 text-xs text-muted">{t("notOnFile")}</p>
            )}
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("latestItems")}
            </h2>
            <Link
              href={`/regwatch/browse?regulator=${regulator.slug}`}
              className="text-xs text-brand-teal hover:underline"
            >
              {t("openInBrowser")}
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState
              title={t("regulatorEmptyTitle")}
              description={t("regulatorEmptyDescription")}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-card-border bg-background">
              {items.map((item) => (
                <RegulationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </RegwatchAppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          accent ? "text-brand-teal" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
