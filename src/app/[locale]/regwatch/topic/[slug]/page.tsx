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
  const label = topicLabel(slug);
  return {
    title: `${label} — Vantage topic`,
    description: `Latest regulations covering ${label} across every jurisdiction monitored by Vantage by intelle.io.`,
  };
}

export default async function TopicPage({ params }: Props) {
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
            Browse
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{label}</span>
        </nav>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Topic
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {label}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Every regulation in the Vantage corpus tagged with{" "}
            <span className="font-mono text-foreground">{slug}</span>. Items are
            tagged by the enrichment cron once they land, plus any topic
            attribution the connector pre-populates.
          </p>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label="Items tagged" value={stats.total} />
          <Stat label="Last 30 days" value={stats.recent30d} accent />
          <div className="rounded-lg border border-card-border bg-card-bg p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Top jurisdictions
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
                <li className="text-muted">No items yet.</li>
              )}
            </ul>
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              Latest items
            </h2>
            <Link
              href={`/regwatch/browse?topic=${slug}`}
              className="text-xs text-brand-teal hover:underline"
            >
              Open in Browser →
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState
              title={`No items tagged ${label} yet.`}
              description="The next crawl + enrichment cycle will populate items here as Claude Haiku tags incoming regulations with this topic."
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
