import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  listRegulationsByTopic,
  getTopicStats,
} from "@/lib/regwatch/queries";
import { TOPIC_TAXONOMY, topicLabel } from "@/lib/regwatch/taxonomy";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { EmptyState } from "@/components/regwatch/EmptyState";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tm = await getTranslations("metadataRw");
  const label = topicLabel(slug);
  return {
    title: tm("topic.title", { label }),
    description: tm("topic.description", { label }),
  };
}

export default async function TopicPage({ params }: Props) {
  const tr = await getTranslations("regwatch.discover");
  const { slug } = await params;
  const known = TOPIC_TAXONOMY.find((t) => t.value === slug);

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    items,
    stats,
  ] = await Promise.all([
    supabase.auth.getUser(),
    listRegulationsByTopic(slug, 100),
    getTopicStats(slug),
  ]);

  // Allow any topic that is either curated OR actually present in the corpus
  // (connector-set topics like SASO's standards/gulf). Only 404 a topic that
  // is both unknown and unused.
  if (!known && items.length === 0) notFound();

  const label = topicLabel(slug);

  return (
    <RegwatchAppShell authed={!!user}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/browse" className="hover:text-foreground">
            {tr("breadcrumbBrowse")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{label}</span>
        </nav>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {tr("topicEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {label}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            {tr.rich("topicDetailSubheading", {
              slug,
              mono: (chunks) => (
                <span className="font-mono text-foreground">{chunks}</span>
              ),
            })}
          </p>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label={tr("itemsTagged")} value={stats.total} />
          <Stat label={tr("last30Days")} value={stats.recent30d} accent />
          <div className="rounded-lg border border-card-border bg-card-bg p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {tr("topJurisdictions")}
            </p>
            <ul className="mt-2 space-y-0.5 text-xs">
              {stats.byJurisdiction.slice(0, 4).map((j) => (
                <li key={j.jurisdiction_code} className="flex justify-between gap-2">
                  <Link
                    href={`/regwatch/browse?jurisdiction=${j.jurisdiction_code}&topic=${slug}`}
                    className="text-muted hover:text-brand-teal"
                  >
                    {j.jurisdiction_code}
                  </Link>
                  <span className="font-mono text-muted/70">{j.count}</span>
                </li>
              ))}
              {stats.byJurisdiction.length === 0 && (
                <li className="text-muted">{tr("noItemsYet")}</li>
              )}
            </ul>
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              {tr("latestItems")}
            </h2>
            <Link
              href={`/regwatch/browse?topic=${slug}`}
              className="text-xs text-brand-teal hover:underline"
            >
              {tr("openInBrowser")}
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState
              title={tr("topicEmptyTitle", { label })}
              description={tr("topicEmptyDescription")}
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
  value: number;
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
