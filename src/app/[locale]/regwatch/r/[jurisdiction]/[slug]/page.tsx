import { useTranslations } from "next-intl";
import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
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
import { RegulationTabsClient } from "@/components/regwatch/regulation/RegulationTabsClient";
import { getOriginalCaptureStatus } from "@/lib/regwatch/regulation-original-actions";

interface Props {
  params: Promise<{ jurisdiction: string; slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jurisdiction, slug } = await params;
  const tm = await getTranslations("metadataRw");
  const item = await getRegulation(jurisdiction, slug);
  if (!item) return { title: tm("regulation.notFound") };
  return {
    title: `${item.citation} — ${item.title}`,
    description: item.summary ?? undefined,
  };
}

export default async function RegulationDetailPage({ params }: Props) {
  const t = await getTranslations("regwatch.discover");
  const format = await getFormatter();
  const { jurisdiction, slug } = await params;
  const item = await getRegulation(jurisdiction, slug);
  if (!item) notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    related,
    originalStatus,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getRelatedRegulations(item.jurisdiction_code, item.id, item.topics, 5),
    getOriginalCaptureStatus(item.id),
  ]);

  const changedAgo = format.relativeTime(new Date(item.last_changed_at));

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
              {t("breadcrumbBrowse")}
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
              {t("backToMyFeed")}
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
          <p className="mt-3 text-xs text-muted">
            {t("lastChangedAgo", { ago: changedAgo })}
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* ---- Reader (dual-view tabs) ---- */}
          <div className="min-w-0">
            <RegulationTabsClient
              regId={item.id}
              sourceUrl={item.source_url}
              hasCached={originalStatus.hasCached}
              sourceLanguage={item.source_language ?? "en"}
              articlesContent={
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
                      {t.rich("noExtractedBody", {
                        strong: (chunks) => (
                          <strong className="text-foreground">{chunks}</strong>
                        ),
                      })}
                    </p>
                  )}

                  <div className="mt-12 rounded-lg border border-card-border bg-card-bg p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      {t("source")}
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
                      {t("sourceCanonicalNote")}
                    </p>
                  </div>
                </article>
              }
            />
          </div>

          {/* ---- Metadata sidebar ---- */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <MetadataPanel item={item} />

            {item.topics.length > 0 && (
              <div className="rounded-lg border border-card-border bg-card-bg p-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                  {t("topicsHeading2")}
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
                  {t("substancesReferenced")}
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
              {t("relatedIn", { jurisdiction: item.regulator.jurisdiction_name })}
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

type Formatter = Awaited<ReturnType<typeof getFormatter>>;

function formatDate(
  format: Formatter,
  value: string | null | undefined,
  fmt: "long" | "short" = "long",
): string {
  if (!value) return "—";
  return format.dateTime(new Date(value), {
    day: "2-digit",
    month: fmt === "long" ? "long" : "short",
    year: "numeric",
  });
}

async function MetadataPanel({
  item,
}: {
  item: Awaited<ReturnType<typeof getRegulation>> & object;
}) {
  const t = await getTranslations("regwatch.discover");
  const format = await getFormatter();
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        {t("metadata")}
      </h2>
      <dl className="mt-3 space-y-3 text-sm">
        <MetaRow label={t("metaCitation")} value={<span className="font-mono">{item.citation}</span>} />
        <MetaRow label={t("metaInstrumentType")} value={<InstrumentTypeBadge value={item.instrument_type} />} />
        <MetaRow label={t("metaStatus")} value={<StatusChip status={item.status} />} />
        {item.effective_date && (
          <MetaRow label={t("metaEffectiveDate")} value={formatDate(format, item.effective_date)} />
        )}
        {item.proposed_date && (
          <MetaRow label={t("metaProposedDate")} value={formatDate(format, item.proposed_date)} />
        )}
        {item.consultation_closes_at && (
          <MetaRow
            label={t("metaConsultationCloses")}
            value={formatDate(format, item.consultation_closes_at)}
          />
        )}
        <MetaRow label={t("metaPublished")} value={formatDate(format, item.published_at)} />
        <MetaRow label={t("metaLastChanged")} value={formatDate(format, item.last_changed_at)} />
      </dl>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-end text-xs text-foreground">{value}</dd>
    </div>
  );
}

function RegulatorCard({
  item,
}: {
  item: Awaited<ReturnType<typeof getRegulation>> & object;
}) {
  const t = useTranslations("regwatch.discover");
  const r = item.regulator;
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        {t("regulator")}
      </h2>
      <p className="mt-2 text-sm font-medium text-foreground">{r.name}</p>
      {r.short_name && <p className="text-xs text-muted">{r.short_name}</p>}
      {r.description && <p className="mt-2 text-xs text-muted">{r.description}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/regwatch/regulator/${r.slug}`}
          className="rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-foreground hover:border-brand-teal"
        >
          {t("regulatorProfile")}
        </Link>
        {r.canonical_url && (
          <a
            href={r.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-foreground hover:border-brand-teal"
          >
            {t("visitSite")}
          </a>
        )}
      </div>
    </div>
  );
}

async function LifecycleStrip({
  item,
}: {
  item: Awaited<ReturnType<typeof getRegulation>> & object;
}) {
  const t = await getTranslations("regwatch.discover");
  const format = await getFormatter();
  // Render a horizontal strip showing the four lifecycle anchors that exist.
  const stages: { label: string; date: string | null }[] = [
    { label: t("lifecycleProposed"), date: item.proposed_date },
    { label: t("lifecycleConsultationCloses"), date: item.consultation_closes_at },
    { label: t("lifecycleEffective"), date: item.effective_date },
    { label: t("lifecycleLastChange"), date: item.last_changed_at },
  ];
  const filled = stages.filter((s) => s.date);
  if (filled.length < 2) return null;

  return (
    <div className="not-prose rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("lifecycle")}</p>
      <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {filled.map((s) => (
          <li key={s.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {s.label}
            </span>
            <time className="text-sm font-medium text-foreground">
              {formatDate(format, s.date, "short")}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}
