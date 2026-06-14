import { useTranslations } from "next-intl";
import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyFootprint, getMyOrganization } from "@/lib/regwatch/footprint";
import {
  listMyFeed,
  getMyFeedCounts,
  listApproachingDeadlines,
  type FeedItem,
} from "@/lib/regwatch/feed-queries";
import { getCorpusRecap, type RecapItem } from "@/lib/regwatch/recap-queries";
import {
  getObligationSummary,
  getDocumentSummary,
  getOpenCommentsByDocument,
} from "@/lib/regwatch/compliance-summary";
import { topicLabel } from "@/lib/regwatch/taxonomy";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export const metadata: Metadata = {
  title: "Weekly recap — Vantage",
  description:
    "Your week in regulation — the most relevant changes scored to your footprint, approaching deadlines, and what moved across the corpus.",
};
export const dynamic = "force-dynamic";

const JURISDICTION_NAMES: Record<string, string> = {
  US: "United States",
  EU: "European Union",
  GB: "United Kingdom",
  CA: "Canada",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  QA: "Qatar",
  INT: "International",
};
const jName = (c: string) => JURISDICTION_NAMES[c] ?? c;

type Formatter = Awaited<ReturnType<typeof getFormatter>>;

function fmtDate(format: Formatter, s: string | null): string {
  if (!s) return "";
  return format.dateTime(new Date(s), { day: "2-digit", month: "short" });
}

const SEV_STYLE: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/10 text-red-300",
  high: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  normal: "border-brand-blue/50 bg-brand-blue/10 text-brand-blue",
  low: "border-card-border bg-card-bg text-muted",
};

export default async function RecapPage() {
  const t = await getTranslations("regwatch.monitor");
  const format = await getFormatter();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekOf = format.dateTime(new Date(), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (!user) {
    const corpus = await getCorpusRecap(7);
    return (
      <RegwatchAppShell authed={false}>
        <Hero
          eyebrow={t("weekOf", { date: weekOf })}
          title={t("corpusHeroTitle")}
          subtitle={t("corpusHeroSubtitle", {
            total: corpus.total.toLocaleString(),
            jurisdictions: corpus.byJurisdiction.length,
          })}
        />
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <JurisdictionBar items={corpus.byJurisdiction} />
          <SectionTitle>{t("recentlyUpdated")}</SectionTitle>
          <CorpusList items={corpus.items} />
          <SignupCta />
        </div>
      </RegwatchAppShell>
    );
  }

  const [org, footprint] = await Promise.all([
    getMyOrganization(),
    getMyFootprint(),
  ]);

  if (!footprint?.is_configured) {
    const corpus = await getCorpusRecap(7);
    return (
      <RegwatchAppShell authed>
        <Hero
          eyebrow={t("weekOf", { date: weekOf })}
          title={t("noFootprintHeroTitle")}
          subtitle={t("noFootprintHeroSubtitle")}
        />
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <Link
            href="/regwatch/settings/footprint"
            className="mb-8 inline-block rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            {t("configureFootprintCta")}
          </Link>
          <JurisdictionBar items={corpus.byJurisdiction} />
          <SectionTitle>{t("recentlyUpdatedCorpus")}</SectionTitle>
          <CorpusList items={corpus.items} />
        </div>
      </RegwatchAppShell>
    );
  }

  const [counts, topPriorities, recentlyChanged, deadlines, obligations, documents, commentsByDoc] =
    await Promise.all([
      getMyFeedCounts(),
      listMyFeed({ sort: "score", limit: 6 }),
      listMyFeed({ sort: "recently_changed", limit: 6 }),
      listApproachingDeadlines(),
      getObligationSummary(),
      getDocumentSummary(),
      getOpenCommentsByDocument(),
    ]);

  // Topic breakdown across the user's active matches (from the loaded sets).
  const topicCount = new Map<string, number>();
  for (const f of [...topPriorities, ...recentlyChanged]) {
    for (const t of f.item.topics ?? []) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  }
  const topTopics = Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);

  return (
    <RegwatchAppShell authed>
      <Hero
        eyebrow={t("weekOf", { date: weekOf })}
        title={t("recapHeroTitle", { org: org?.organization.name ?? t("feedHeadingFallbackOrg") })}
        subtitle={t("recapHeroSubtitle", {
          total: counts.total.toLocaleString(),
          unseen: counts.unseen,
          deadlines: counts.hits_30d,
        })}
      />

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("statMatching")} value={counts.total} />
          <Stat label={t("statCritical")} value={counts.critical} accent="red" />
          <Stat label={t("statHigh")} value={counts.high} accent="amber" />
          <Stat label={t("statDeadlines30d")} value={counts.hits_30d} accent="teal" />
        </div>

        <SectionTitle action={{ href: "/regwatch/feed", label: t("openFullFeed") }}>
          {t("topPriorities")}
        </SectionTitle>
        <FeedList items={topPriorities} empty={t("emptyTopPriorities")} />

        <SectionTitle>{t("recentlyChanged")}</SectionTitle>
        <FeedList items={recentlyChanged} empty={t("emptyRecentlyChanged")} />

        {deadlines.length > 0 && (
          <>
            <SectionTitle>{t("approachingDeadlines")}</SectionTitle>
            <FeedList items={deadlines.slice(0, 6)} showDeadline empty="" />
          </>
        )}

        <SectionTitle action={{ href: "/regwatch/obligations", label: t("manageObligations") }}>
          {t("complianceObligations")}
        </SectionTitle>
        {obligations.total === 0 ? (
          <p className="text-sm text-muted">
            {t.rich("emptyObligations", {
              link: (chunks) => (
                <Link href="/regwatch/obligations" className="text-brand-teal hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={t("statTotal")} value={obligations.total} />
            <Stat label={t("statOpen")} value={obligations.open} accent="teal" />
            <Stat label={t("statInReview")} value={obligations.inReview} />
            <Stat label={t("statVerified")} value={obligations.verified} />
            <Stat label={t("statCritical")} value={obligations.critical} accent="red" />
            <Stat label={t("statAtRisk")} value={obligations.atRisk} accent="amber" />
          </div>
        )}

        <SectionTitle action={{ href: "/regwatch/documents", label: t("openDocuments") }}>
          {t("companyDocuments")}
        </SectionTitle>
        {documents.total === 0 ? (
          <p className="text-sm text-muted">
            {t.rich("emptyDocuments", {
              link: (chunks) => (
                <Link href="/regwatch/documents" className="text-brand-teal hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label={t("statTotal")} value={documents.total} />
              <Stat label={t("statDrafts")} value={documents.draft} accent="teal" />
              <Stat label={t("statInReview")} value={documents.inReview} accent="amber" />
              <Stat label={t("statLive")} value={documents.live} />
              <Stat label={t("statOpenComments")} value={documents.openComments} />
            </div>
            {commentsByDoc.length > 0 && (
              <div className="mt-3 rounded-xl border border-card-border bg-card-bg/40 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {t("underCommenting")}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {commentsByDoc.map((c) => (
                    <li key={c.documentId} className="flex items-center justify-between gap-3 text-sm">
                      <Link
                        href={`/regwatch/documents/${c.documentId}`}
                        className="truncate text-foreground hover:text-brand-teal"
                      >
                        {c.title}
                      </Link>
                      <span className="shrink-0 text-xs text-amber-300">
                        {t("openComments", { count: c.count })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {topTopics.length > 0 && (
          <>
            <SectionTitle>{t("activeTopics")}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {topTopics.map((t) => (
                <Link
                  key={t}
                  href={`/regwatch/topic/${t}`}
                  className="rounded-full border border-card-border bg-card-bg px-3 py-1 text-xs text-foreground hover:border-brand-blue"
                >
                  {topicLabel(t)}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </RegwatchAppShell>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function Hero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className="border-b border-card-border bg-card-bg/30">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">{subtitle}</p>
      </div>
    </header>
  );
}

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 mt-10 flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{children}</h2>
      {action && (
        <Link href={action.href} className="text-xs text-brand-teal hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "red" | "amber" | "teal" }) {
  const color =
    accent === "red" ? "text-red-300" : accent === "amber" ? "text-amber-300" : accent === "teal" ? "text-brand-teal" : "text-foreground";
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

async function FeedList({ items, empty, showDeadline }: { items: FeedItem[]; empty: string; showDeadline?: boolean }) {
  const t = await getTranslations("regwatch.monitor");
  const format = await getFormatter();
  if (items.length === 0) {
    return empty ? <p className="text-sm text-muted">{empty}</p> : null;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-background">
      {items.map((f) => {
        const dl = f.item.consultation_closes_at ?? f.item.effective_date;
        return (
          <Link
            key={f.match_id}
            href={`/regwatch/r/${f.item.jurisdiction_code.toLowerCase()}/${f.item.slug}`}
            className="flex items-center gap-3 border-b border-card-border px-4 py-3 last:border-b-0 hover:bg-card-bg/40"
          >
            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${SEV_STYLE[f.severity] ?? SEV_STYLE.low}`}>
              {f.severity}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{f.item.title}</p>
              <p className="truncate text-[11px] text-muted">
                {f.item.jurisdiction_code} · {f.item.regulator.short_name ?? f.item.regulator.name} · {f.item.citation}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted">
              {showDeadline && dl
                ? t("dueDate", { date: fmtDate(format, dl) })
                : t("changedDate", { date: fmtDate(format, f.item.last_changed_at) })}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

async function CorpusList({ items }: { items: RecapItem[] }) {
  const t = await getTranslations("regwatch.monitor");
  const format = await getFormatter();
  if (items.length === 0) return <p className="text-sm text-muted">{t("noCorpusChanges")}</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-background">
      {items.map((r) => (
        <Link
          key={`${r.jurisdiction_code}-${r.slug}`}
          href={`/regwatch/r/${r.jurisdiction_code.toLowerCase()}/${r.slug}`}
          className="flex items-center gap-3 border-b border-card-border px-4 py-3 last:border-b-0 hover:bg-card-bg/40"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{r.title}</p>
            <p className="truncate text-[11px] text-muted">
              {r.jurisdiction_code} · {r.regulator_name} · {r.citation}
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-muted">{fmtDate(format, r.last_changed_at)}</span>
        </Link>
      ))}
    </div>
  );
}

function JurisdictionBar({ items }: { items: { code: string; count: number }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.slice(0, 10).map((j) => (
        <Link
          key={j.code}
          href={`/regwatch/browse/${j.code.toLowerCase()}`}
          className="rounded-full border border-card-border bg-card-bg px-3 py-1 text-xs text-foreground hover:border-brand-blue"
        >
          {jName(j.code)} <span className="text-muted">· {j.count}</span>
        </Link>
      ))}
    </div>
  );
}

function SignupCta() {
  const t = useTranslations("regwatch.monitor");
  return (
    <div className="mt-12 rounded-xl border border-brand-teal/40 bg-brand-teal/5 p-6 text-center">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {t("signupCtaTitle")}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
        {t("signupCtaBody")}
      </p>
      <Link
        href="/regwatch/signup"
        className="mt-4 inline-block rounded-md bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue/90"
      >
        {t("signupCtaButton")}
      </Link>
    </div>
  );
}
