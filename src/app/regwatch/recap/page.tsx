import Link from "next/link";
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

function fmtDate(s: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const SEV_STYLE: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/10 text-red-300",
  high: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  normal: "border-brand-blue/50 bg-brand-blue/10 text-brand-blue",
  low: "border-card-border bg-card-bg text-muted",
};

export default async function RecapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekOf = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (!user) {
    const corpus = await getCorpusRecap(7);
    return (
      <RegwatchAppShell authed={false}>
        <Hero
          eyebrow={`Week of ${weekOf}`}
          title="This week across the corpus"
          subtitle={`${corpus.total.toLocaleString()} regulations were added or updated in the last 7 days across ${corpus.byJurisdiction.length} jurisdictions.`}
        />
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <JurisdictionBar items={corpus.byJurisdiction} />
          <SectionTitle>Recently updated</SectionTitle>
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
          eyebrow={`Week of ${weekOf}`}
          title="Set a footprint to personalise your recap"
          subtitle="Once you define your geographies, activities and topics, this page becomes a weekly digest of the changes that matter to you. Meanwhile, here's what moved across the whole corpus."
        />
        <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <Link
            href="/regwatch/settings/footprint"
            className="mb-8 inline-block rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
          >
            Configure your footprint →
          </Link>
          <JurisdictionBar items={corpus.byJurisdiction} />
          <SectionTitle>Recently updated across the corpus</SectionTitle>
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
        eyebrow={`Week of ${weekOf}`}
        title={`${org?.organization.name ?? "Your"} — week in review`}
        subtitle={`${counts.total.toLocaleString()} regulations match your footprint right now. ${counts.unseen} unseen · ${counts.hits_30d} with a deadline in the next 30 days.`}
      />

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Matching" value={counts.total} />
          <Stat label="Critical" value={counts.critical} accent="red" />
          <Stat label="High" value={counts.high} accent="amber" />
          <Stat label="Deadlines ≤30d" value={counts.hits_30d} accent="teal" />
        </div>

        <SectionTitle action={{ href: "/regwatch/feed", label: "Open full feed →" }}>
          Top priorities
        </SectionTitle>
        <FeedList items={topPriorities} empty="No high-scoring matches right now." />

        <SectionTitle>Recently changed</SectionTitle>
        <FeedList items={recentlyChanged} empty="No recent changes among your matches." />

        {deadlines.length > 0 && (
          <>
            <SectionTitle>Approaching deadlines</SectionTitle>
            <FeedList items={deadlines.slice(0, 6)} showDeadline empty="" />
          </>
        )}

        <SectionTitle action={{ href: "/regwatch/obligations", label: "Manage obligations →" }}>
          Compliance obligations
        </SectionTitle>
        {obligations.total === 0 ? (
          <p className="text-sm text-muted">
            No obligations yet —{" "}
            <Link href="/regwatch/obligations" className="text-brand-teal hover:underline">
              pin a regulation to an asset
            </Link>{" "}
            to start tracking.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Total" value={obligations.total} />
            <Stat label="Open" value={obligations.open} accent="teal" />
            <Stat label="In review" value={obligations.inReview} />
            <Stat label="Verified" value={obligations.verified} />
            <Stat label="Critical" value={obligations.critical} accent="red" />
            <Stat label="At risk" value={obligations.atRisk} accent="amber" />
          </div>
        )}

        <SectionTitle action={{ href: "/regwatch/documents", label: "Open documents →" }}>
          Company documents
        </SectionTitle>
        {documents.total === 0 ? (
          <p className="text-sm text-muted">
            No documents yet —{" "}
            <Link href="/regwatch/documents" className="text-brand-teal hover:underline">
              author an SOP or policy
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Total" value={documents.total} />
              <Stat label="Drafts" value={documents.draft} accent="teal" />
              <Stat label="In review" value={documents.inReview} accent="amber" />
              <Stat label="Live" value={documents.live} />
              <Stat label="Open comments" value={documents.openComments} />
            </div>
            {commentsByDoc.length > 0 && (
              <div className="mt-3 rounded-xl border border-card-border bg-card-bg/40 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Under commenting
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
                        {c.count} open {c.count === 1 ? "comment" : "comments"}
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
            <SectionTitle>Active topics</SectionTitle>
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

function FeedList({ items, empty, showDeadline }: { items: FeedItem[]; empty: string; showDeadline?: boolean }) {
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
              {showDeadline && dl ? `due ${fmtDate(dl)}` : `changed ${fmtDate(f.item.last_changed_at)}`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function CorpusList({ items }: { items: RecapItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">No changes in the last 7 days.</p>;
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
          <span className="shrink-0 text-[11px] text-muted">{fmtDate(r.last_changed_at)}</span>
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
  return (
    <div className="mt-12 rounded-xl border border-brand-teal/40 bg-brand-teal/5 p-6 text-center">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        Get this weekly — scored to your operations
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
        Define your footprint once and your recap becomes a personalised digest of
        only the regulations that touch your geographies, activities and assets.
      </p>
      <Link
        href="/regwatch/signup"
        className="mt-4 inline-block rounded-md bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue/90"
      >
        Create a free account →
      </Link>
    </div>
  );
}
