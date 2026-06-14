import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { TOPIC_TAXONOMY, topicLabel } from "@/lib/regwatch/taxonomy";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export const metadata: Metadata = {
  title: "Topics — Vantage",
  description:
    "Every topic Vantage by intelle.io tracks — emissions, methane, PFAS, CBAM, process safety, and more — with live counts.",
};
export const dynamic = "force-dynamic";

// Group topics by category so the page tells a story rather than reading as a
// flat alphabetical list. Each category gets a colour accent applied to the
// matching topic tiles.
const TOPIC_GROUPS: {
  key: string;
  topics: string[];
  accent: "teal" | "blue" | "violet" | "amber" | "red" | "muted";
}[] = [
  {
    key: "climate",
    topics: ["emissions", "methane", "carbon-market"],
    accent: "teal",
  },
  {
    key: "reporting",
    topics: ["reporting"],
    accent: "blue",
  },
  {
    key: "permitting",
    topics: ["permitting"],
    accent: "violet",
  },
  {
    key: "safety",
    topics: ["worker-safety", "process-safety"],
    accent: "amber",
  },
  {
    key: "chemicals",
    topics: ["pfas", "bunker-spec"],
    accent: "red",
  },
  {
    key: "other",
    topics: ["tax", "sanctions"],
    accent: "muted",
  },
];

const ACCENT_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  teal: { border: "border-brand-teal/50", bg: "bg-brand-teal/5", text: "text-brand-teal" },
  blue: { border: "border-brand-blue/50", bg: "bg-brand-blue/5", text: "text-brand-blue" },
  violet: { border: "border-brand-violet/50", bg: "bg-brand-violet/5", text: "text-brand-violet" },
  amber: { border: "border-amber-400/50", bg: "bg-amber-400/5", text: "text-amber-300" },
  red: { border: "border-red-500/50", bg: "bg-red-500/5", text: "text-red-300" },
  muted: { border: "border-card-border", bg: "bg-card-bg/40", text: "text-muted" },
};

export default async function TopicsCloudPage() {
  const t = await getTranslations("regwatch.discover");
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    countsResp,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("regulatory_items")
      .select("topics, last_changed_at"),
  ]);

  // Compute per-topic totals + 30-day recents in one client-side aggregation.
  const total = new Map<string, number>();
  const recent = new Map<string, number>();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const row of countsResp.data ?? []) {
    const ts = new Date(row.last_changed_at as string).getTime();
    const isRecent = isFinite(ts) && ts >= cutoff;
    for (const t of (row.topics as string[]) ?? []) {
      total.set(t, (total.get(t) ?? 0) + 1);
      if (isRecent) recent.set(t, (recent.get(t) ?? 0) + 1);
    }
  }
  const grandTotal = Array.from(total.values()).reduce((a, b) => a + b, 0);
  const grandRecent = Array.from(recent.values()).reduce((a, b) => a + b, 0);

  // Dynamic fallback: any topic present in the corpus but not shown in a
  // curated group (e.g. connector-set topics like SASO's standards/gulf) still
  // surfaces here, so newly-ingested regulations never go invisible.
  const coveredSlugs = new Set(TOPIC_GROUPS.flatMap((g) => g.topics));
  const otherTopics = Array.from(total.entries())
    .filter(([slug, count]) => count > 0 && !coveredSlugs.has(slug))
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);

  // Hero — the three biggest topics by total count.
  const hero = [...TOPIC_TAXONOMY]
    .map((t) => ({ value: t.value, label: t.label, count: total.get(t.value) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <RegwatchAppShell authed={!!user}>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {t("topicsEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.rich("topicsHeading", {
              highlight: (chunks) => (
                <span className="gradient-text">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted">
            {t("topicsSubheading", { count: TOPIC_TAXONOMY.length })}
          </p>

          {/* Hero stats — three biggest topics */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {hero.map((topic) => (
              <Link
                key={topic.value}
                href={`/regwatch/topic/${topic.value}`}
                className="group rounded-xl border border-brand-teal/40 bg-brand-teal/5 p-4 transition-all hover:border-brand-teal hover:shadow-lg hover:shadow-brand-teal/10"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-brand-teal">
                  {t("topTopic")}
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  {topic.label}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-brand-teal">
                  {topic.count}
                </p>
                <p className="text-[11px] text-muted">{t("itemsInCorpus")}</p>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Coverage strip */}
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-card-border bg-card-bg/40 px-5 py-4 text-xs">
          <p className="text-muted">
            {t.rich("topicCoverage", {
              total: grandTotal.toLocaleString(),
              recent: grandRecent.toLocaleString(),
              strong: (chunks) => (
                <span className="font-medium text-foreground">{chunks}</span>
              ),
              accent: (chunks) => (
                <span className="font-medium text-brand-teal">{chunks}</span>
              ),
            })}
          </p>
          <Link
            href="/regwatch/browse"
            className="text-brand-teal hover:underline"
          >
            {t("openBrowser")}
          </Link>
        </div>

        {/* Grouped topic grid */}
        <div className="space-y-12">
          {TOPIC_GROUPS.map((group) => {
            const styles = ACCENT_STYLES[group.accent];
            return (
              <section key={group.key}>
                <header className="mb-4 flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className={`text-lg font-semibold tracking-tight ${styles.text}`}>
                      {t(`topicGroup.${group.key}.label`)}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {t(`topicGroup.${group.key}.description`)}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted">
                    {t("topicCount", { count: group.topics.length })}
                  </span>
                </header>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.topics.map((slug) => {
                    const count = total.get(slug) ?? 0;
                    const r = recent.get(slug) ?? 0;
                    return (
                      <TopicTile
                        key={slug}
                        slug={slug}
                        label={topicLabel(slug)}
                        total={count}
                        recent30d={r}
                        styles={styles}
                        itemsLabel={t("itemsLabel", { count })}
                        viewFeedLabel={t("viewTopicFeed")}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          {otherTopics.length > 0 && (
            <section>
              <header className="mb-4 flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-muted">
                    {t("otherTopicsTitle")}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("otherTopicsDescription")}
                  </p>
                </div>
                <span className="text-[11px] text-muted">
                  {t("topicCount", { count: otherTopics.length })}
                </span>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {otherTopics.map((slug) => (
                  <TopicTile
                    key={slug}
                    slug={slug}
                    label={topicLabel(slug)}
                    total={total.get(slug) ?? 0}
                    recent30d={recent.get(slug) ?? 0}
                    styles={ACCENT_STYLES.muted}
                    itemsLabel={t("itemsLabel", { count: total.get(slug) ?? 0 })}
                    viewFeedLabel={t("viewTopicFeed")}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Suggest a topic CTA */}
        <p className="mt-16 text-center text-xs text-muted">
          {t.rich("topicsCta", {
            link: (chunks) => (
              <Link
                href="/contact?service_interest=regwatch-coverage"
                className="text-brand-teal hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </RegwatchAppShell>
  );
}

interface TileProps {
  slug: string;
  label: string;
  total: number;
  recent30d: number;
  styles: { border: string; bg: string; text: string };
  itemsLabel: string;
  viewFeedLabel: string;
}

function TopicTile({
  slug,
  label,
  total,
  recent30d,
  styles,
  itemsLabel,
  viewFeedLabel,
}: TileProps) {
  return (
    <Link
      href={`/regwatch/topic/${slug}`}
      className={`group relative block overflow-hidden rounded-xl border bg-card-bg p-4 transition-all hover:shadow-lg ${styles.border} hover:${styles.bg.replace("bg-", "shadow-")}`}
    >
      {/* Left accent bar */}
      <span
        aria-hidden
        className={`absolute start-0 top-0 h-full w-1 ${styles.bg.replace("/5", "")}`}
      />
      <div className="flex items-start justify-between gap-2 ps-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {label}
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted">
            {slug}
          </p>
        </div>
        {recent30d > 0 && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${styles.bg} ${styles.text}`}
          >
            +{recent30d}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between ps-2">
        <p className="font-mono text-2xl font-semibold text-foreground">
          {total}
        </p>
        <p className="text-[11px] text-muted">
          {itemsLabel}
        </p>
      </div>
      <p className="mt-2 ps-2 text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
        {viewFeedLabel}
      </p>
    </Link>
  );
}
