import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import {
  getRegulation,
  getRelatedRegulations,
} from "@/lib/regwatch/queries";
import { topicLabel } from "@/lib/regwatch/taxonomy";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { StatusChip } from "@/components/regwatch/StatusChip";
import { InstrumentTypeBadge } from "@/components/regwatch/InstrumentTypeBadge";
import { RegulationRow } from "@/components/regwatch/RegulationRow";
import { RegwatchChatWidget } from "@/components/regwatch/chat/RegwatchChatWidget";

interface Props {
  params: Promise<{ jurisdiction: string; slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jurisdiction, slug } = await params;
  const item = await getRegulation(jurisdiction, slug);
  if (!item) return { title: "Regulation not found" };
  return {
    title: `${item.citation} — ${item.title}`,
    description: item.summary ?? undefined,
  };
}

export default async function RegulationDetailPage({ params }: Props) {
  const { jurisdiction, slug } = await params;
  const item = await getRegulation(jurisdiction, slug);
  if (!item) notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    related,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getRelatedRegulations(item.jurisdiction_code, item.id, item.topics, 5),
  ]);

  const changedAgo = formatDistanceToNowStrict(new Date(item.last_changed_at), {
    addSuffix: true,
  });

  return (
    <RegwatchAppShell authed={!!user} suppressChatWidget>
      <RegwatchChatWidget
        scopedItemId={item.id}
        scopedItemCitation={item.citation}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/browse" className="hover:text-foreground">
              Browse
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/regwatch/browse/${item.jurisdiction_code.toLowerCase()}`}
              className="hover:text-foreground"
            >
              {item.regulator.jurisdiction_name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{item.citation}</span>
          </nav>
          {user && (
            <Link
              href="/regwatch/feed"
              className="rounded-md border border-card-border bg-card-bg px-2.5 py-1 text-[11px] text-muted hover:border-brand-teal hover:text-foreground"
            >
              ← Back to My Feed
            </Link>
          )}
        </div>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="rounded-md bg-brand-navy/60 px-2 py-0.5 font-medium uppercase tracking-wider">
              {item.jurisdiction_code}
            </span>
            <span className="font-medium text-foreground/80">
              {item.regulator.short_name ?? item.regulator.name}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono">{item.citation}</span>
            <InstrumentTypeBadge value={item.instrument_type} />
            <StatusChip status={item.status} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {item.title}
          </h1>
          {item.summary && (
            <p className="mt-3 max-w-3xl text-base text-muted">{item.summary}</p>
          )}
          <p className="mt-3 text-xs text-muted">Last changed {changedAgo}.</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* ---- Reader ---- */}
          <article className="prose prose-invert max-w-none">
            <LifecycleStrip item={item} />

            {item.body_html ? (
              <div
                className="mt-8 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.body_html }}
              />
            ) : item.body_text ? (
              <p className="mt-8 whitespace-pre-line">{item.body_text}</p>
            ) : (
              <p className="mt-8 text-muted">
                Full body unavailable in the seed corpus. Phase 1.x ingest will populate
                the body for items crawled directly from the regulator source.
              </p>
            )}

            <div className="mt-12 rounded-lg border border-card-border bg-card-bg p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Source
              </p>
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-brand-teal hover:underline"
              >
                {item.source_url}
              </a>
              <p className="mt-2 text-xs text-muted">
                Canonical document at the regulator. Always cite this URL — not the
                Vantage detail page — in compliance evidence.
              </p>
            </div>
          </article>

          {/* ---- Metadata sidebar ---- */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <MetadataPanel item={item} />

            {item.topics.length > 0 && (
              <div className="rounded-lg border border-card-border bg-card-bg p-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                  Topics
                </h2>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {item.topics.map((t) => (
                    <li key={t}>
                      <Link
                        href={`/regwatch/browse?topic=${encodeURIComponent(t)}`}
                        className="rounded-full border border-card-border bg-background px-2 py-0.5 text-[11px] text-foreground hover:border-brand-teal hover:text-brand-teal"
                      >
                        {topicLabel(t)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.substances_cas.length > 0 && (
              <div className="rounded-lg border border-card-border bg-card-bg p-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                  Substances referenced
                </h2>
                <ul className="mt-2 space-y-1 font-mono text-xs text-foreground">
                  {item.substances_cas.map((cas) => (
                    <li key={cas}>CAS {cas}</li>
                  ))}
                </ul>
              </div>
            )}

            <RegulatorCard item={item} />
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              Related in {item.regulator.jurisdiction_name}
            </h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-card-border bg-background">
              {related.map((r) => (
                <RegulationRow key={r.id} item={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </RegwatchAppShell>
  );
}

function formatDate(value: string | null | undefined, fmt: "long" | "short" = "long"): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: fmt === "long" ? "long" : "short",
    year: "numeric",
  });
}

function MetadataPanel({
  item,
}: {
  item: Awaited<ReturnType<typeof getRegulation>> & object;
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Metadata
      </h2>
      <dl className="mt-3 space-y-3 text-sm">
        <MetaRow label="Citation" value={<span className="font-mono">{item.citation}</span>} />
        <MetaRow label="Instrument type" value={<InstrumentTypeBadge value={item.instrument_type} />} />
        <MetaRow label="Status" value={<StatusChip status={item.status} />} />
        {item.effective_date && (
          <MetaRow label="Effective date" value={formatDate(item.effective_date)} />
        )}
        {item.proposed_date && (
          <MetaRow label="Proposed date" value={formatDate(item.proposed_date)} />
        )}
        {item.consultation_closes_at && (
          <MetaRow
            label="Consultation closes"
            value={formatDate(item.consultation_closes_at)}
          />
        )}
        <MetaRow label="Published" value={formatDate(item.published_at)} />
        <MetaRow label="Last changed" value={formatDate(item.last_changed_at)} />
      </dl>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-right text-xs text-foreground">{value}</dd>
    </div>
  );
}

function RegulatorCard({
  item,
}: {
  item: Awaited<ReturnType<typeof getRegulation>> & object;
}) {
  const r = item.regulator;
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Regulator
      </h2>
      <p className="mt-2 text-sm font-medium text-foreground">{r.name}</p>
      {r.short_name && <p className="text-xs text-muted">{r.short_name}</p>}
      {r.description && <p className="mt-2 text-xs text-muted">{r.description}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/regwatch/regulator/${r.slug}`}
          className="rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-foreground hover:border-brand-teal"
        >
          Regulator profile →
        </Link>
        {r.canonical_url && (
          <a
            href={r.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-foreground hover:border-brand-teal"
          >
            Visit site ↗
          </a>
        )}
      </div>
    </div>
  );
}

function LifecycleStrip({
  item,
}: {
  item: Awaited<ReturnType<typeof getRegulation>> & object;
}) {
  // Render a horizontal strip showing the four lifecycle anchors that exist.
  const stages: { label: string; date: string | null }[] = [
    { label: "Proposed", date: item.proposed_date },
    { label: "Consultation closes", date: item.consultation_closes_at },
    { label: "Effective", date: item.effective_date },
    { label: "Last change", date: item.last_changed_at },
  ];
  const filled = stages.filter((s) => s.date);
  if (filled.length < 2) return null;

  return (
    <div className="not-prose rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Lifecycle</p>
      <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {filled.map((s) => (
          <li key={s.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {s.label}
            </span>
            <time className="text-sm font-medium text-foreground">
              {formatDate(s.date, "short")}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}
