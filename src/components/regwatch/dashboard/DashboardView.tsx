import { useTranslations } from "next-intl";
import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DashboardData } from "@/lib/regwatch/dashboard-queries";

type Formatter = Awaited<ReturnType<typeof getFormatter>>;
import { Card, Stat, RowLink, SetupState, StackedBar } from "./parts";

type CardKey =
  | "regulations"
  | "monitor"
  | "inbox"
  | "obligations"
  | "assets"
  | "documents";

/** Role-adaptive card order — same six cards, emphasis by footprint role. */
function orderForRole(role: string | null): CardKey[] {
  const r = (role ?? "").toLowerCase();
  if (r.includes("ehs"))
    return ["assets", "documents", "obligations", "inbox", "monitor", "regulations"];
  if (r.includes("legal"))
    return ["regulations", "obligations", "monitor", "inbox", "documents", "assets"];
  if (r.includes("esg") || r.includes("sustain"))
    return ["monitor", "regulations", "obligations", "documents", "assets", "inbox"];
  if (r.includes("gov") || r.includes("affairs"))
    return ["monitor", "regulations", "obligations", "inbox", "documents", "assets"];
  if (r.includes("complian") || r.includes("officer"))
    return ["obligations", "inbox", "monitor", "documents", "assets", "regulations"];
  return ["monitor", "obligations", "inbox", "assets", "documents", "regulations"];
}

const ASSET_LEVEL_KEY: Record<number, string> = {
  2: "levelOrg",
  3: "levelDivision",
  4: "levelSite",
  5: "levelFacility",
  6: "levelComponent",
};

function ago(format: Formatter, iso: string | null): string {
  if (!iso) return "";
  try {
    return format.relativeTime(new Date(iso));
  } catch {
    return "";
  }
}

export function DashboardView({ data }: { data: DashboardData }) {
  const isFree = data.tier === "free";
  const order = orderForRole(data.role);
  const cards: Record<CardKey, React.ReactNode> = {
    regulations: <RegulationsCard data={data} />,
    monitor: <MonitorCard data={data} isFree={isFree} />,
    inbox: <InboxCard data={data} isFree={isFree} />,
    obligations: <ObligationsCard data={data} isFree={isFree} />,
    assets: <AssetsCard data={data} isFree={isFree} />,
    documents: <DocumentsCard data={data} isFree={isFree} />,
  };

  return (
    <div className="space-y-6">
      {/* Hero region */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <KpiStrip data={data} />
          <FocusCallout data={data} />
          <MyQueue data={data} />
        </div>
        <PostureCard data={data} />
      </div>

      {/* Role-ordered business-line cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((k) => (
          <div key={k}>{cards[k]}</div>
        ))}
      </div>

      <RecentActivity data={data} />
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function KpiStrip({ data }: { data: DashboardData }) {
  const t = useTranslations("regwatch.dashboard");
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-card-border bg-card-bg/40 p-3 sm:grid-cols-4">
      <Stat
        value={data.feed.critical}
        label={t("criticalInScope")}
        tone={data.feed.critical > 0 ? "danger" : "default"}
        href="/regwatch/monitor/today?severity=critical"
      />
      <Stat
        value={data.inbox.total}
        label={t("reviewsAwaiting")}
        tone={data.inbox.total > 0 ? "warn" : "good"}
        href="/regwatch/comply/inbox"
      />
      <Stat
        value={data.obligations.overdue}
        label={t("overdueObligations")}
        tone={data.obligations.overdue > 0 ? "danger" : "default"}
        href="/regwatch/obligations"
      />
      <Stat
        value={data.feed.hits_30d}
        label={t("deadlines30")}
        tone={data.feed.hits_30d > 0 ? "warn" : "default"}
        href="/regwatch/monitor/today?sort=deadline"
      />
    </div>
  );
}

function FocusCallout({ data }: { data: DashboardData }) {
  const t = useTranslations("regwatch.dashboard");
  let text: string | null = null;
  let href = "/regwatch/monitor/today";
  if (data.feed.critical > 0) {
    text = t("focusCritical", { count: data.feed.critical });
    href = "/regwatch/monitor/today?severity=critical";
  } else if (data.obligations.overdue > 0) {
    text = t("focusOverdue", { count: data.obligations.overdue });
    href = "/regwatch/obligations";
  } else if (data.obligations.highSeverityOpen > 0) {
    text = t("focusHighSeverity", { count: data.obligations.highSeverityOpen });
    href = "/regwatch/obligations";
  } else if (data.inbox.total > 0) {
    text = t("focusReviews", { count: data.inbox.total });
    href = "/regwatch/comply/inbox";
  }
  if (!text) {
    return (
      <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
        {t("allClear")}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200 hover:bg-amber-500/10"
    >
      <span>
        <span className="me-2">⚡</span>
        {text}
      </span>
      <span className="shrink-0 text-amber-300">{t("review")}</span>
    </Link>
  );
}

async function MyQueue({ data }: { data: DashboardData }) {
  const t = await getTranslations("regwatch.dashboard");
  const format = await getFormatter();
  const items = [...data.inbox.obligationReviews, ...data.inbox.docReviews].slice(0, 6);
  return (
    <Card title={t("myQueue")} href="/regwatch/comply/inbox" accent="violet">
      {items.length === 0 ? (
        <p className="py-2 text-xs text-brand-teal">{t("queueEmpty")}</p>
      ) : (
        <div className="-mx-2">
          {items.map((it) => (
            <RowLink
              key={`${it.kind}-${it.id}`}
              href={it.href}
              title={it.title}
              meta={it.dueAt ? t("dueMeta", { time: ago(format, it.dueAt) }) : undefined}
              pill={it.kind === "doc-review" ? t("pillDoc") : t("pillObligation")}
              pillTone={it.kind === "doc-review" ? "good" : "warn"}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function PostureCard({ data }: { data: DashboardData }) {
  const t = useTranslations("regwatch.dashboard");
  const o = data.obligations;
  const score =
    o.total > 0
      ? Math.round(
          (100 * (o.compliant + 0.5 * o.atRisk + 0.3 * o.unknown)) / o.total,
        )
      : null;
  const tone =
    score === null ? "default" : score >= 80 ? "good" : score >= 50 ? "warn" : "danger";
  return (
    <Card title={t("compliancePosture")} href="/regwatch/obligations" accent="teal">
      {o.total === 0 ? (
        <SetupState
          text={t("postureSetup")}
          ctaLabel={t("createObligation")}
          ctaHref="/regwatch/obligations"
          locked={data.tier === "free"}
        />
      ) : (
        <>
          <div className="mb-3 flex items-end gap-2">
            <span
              className={`text-4xl font-semibold tabular-nums ${
                tone === "good"
                  ? "text-brand-teal"
                  : tone === "warn"
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {score}
            </span>
            <span className="pb-1 text-xs text-muted">{t("postureSuffix")}</span>
          </div>
          <StackedBar
            segments={[
              { value: o.compliant, className: "bg-brand-teal", label: t("compliant") },
              { value: o.atRisk, className: "bg-amber-400", label: t("atRisk") },
              { value: o.nonCompliant, className: "bg-red-500", label: t("nonCompliant") },
              { value: o.unknown, className: "bg-card-border", label: t("unknown") },
            ]}
          />
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <PostureLine n={o.compliant} label={t("compliant")} dot="bg-brand-teal" />
            <PostureLine n={o.atRisk} label={t("atRisk")} dot="bg-amber-400" />
            <PostureLine n={o.nonCompliant} label={t("nonCompliant")} dot="bg-red-500" />
            <PostureLine n={o.unknown} label={t("unknown")} dot="bg-card-border" />
          </dl>
          {o.overdue > 0 && (
            <p className="mt-3 text-[11px] text-red-300">
              {t("reviewsOverdue", { count: o.overdue })}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function PostureLine({ n, label, dot }: { n: number; label: string; dot: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="tabular-nums text-foreground">{n}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

/* ───────────────────────── Cards ───────────────────────── */

function RegulationsCard({ data }: { data: DashboardData }) {
  const t = useTranslations("regwatch.dashboard");
  return (
    <Card title={t("regulations")} href="/regwatch/browse" accent="blue">
      {!data.hasFootprint ? (
        <SetupState
          text={t("regSetup")}
          ctaLabel={t("setupFootprint")}
          ctaHref="/regwatch/settings/footprint"
        />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat value={data.feed.total} label={t("inYourScope")} />
            <Stat value={data.coverage.regulators} label={t("regulators")} />
            <Stat value={data.coverage.topics} label={t("topics")} />
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5">
            {[
              [t("browse"), "/regwatch/browse"],
              [t("search"), "/regwatch/search"],
              [t("regulators"), "/regwatch/regulators"],
              [t("topics"), "/regwatch/topics"],
            ].map(([l, h]) => (
              <Link
                key={h}
                href={h}
                className="rounded-full border border-card-border bg-card-bg px-2.5 py-0.5 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
              >
                {l}
              </Link>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

async function MonitorCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const t = await getTranslations("regwatch.dashboard");
  const format = await getFormatter();
  return (
    <Card
      title={t("monitor")}
      href="/regwatch/monitor/today"
      accent="blue"
      badge={
        data.alertsUnseen > 0 ? (
          <span className="rounded-full bg-red-500/20 px-1.5 text-[10px] font-semibold text-red-300">
            {data.alertsUnseen}
          </span>
        ) : undefined
      }
    >
      {isFree ? (
        <SetupState
          text={t("monitorFreeSetup")}
          ctaLabel={t("upgradeTeam")}
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : !data.hasFootprint ? (
        <SetupState
          text={t("monitorFootprintSetup")}
          ctaLabel={t("setupFootprint")}
          ctaHref="/regwatch/settings/footprint"
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={data.alertsUnseen} label={t("unseenAlerts")} tone={data.alertsUnseen > 0 ? "warn" : "default"} />
            <Stat value={data.feed.critical} label={t("critical")} tone={data.feed.critical > 0 ? "danger" : "default"} />
            <Stat value={data.feed.high} label={t("high")} />
          </div>
          <div className="-mx-2 mt-auto">
            {data.topAlerts.slice(0, 3).map((a) => (
              <RowLink
                key={a.matchId}
                href={`/regwatch/r/${a.jurisdictionCode.toLowerCase()}/${a.slug}`}
                title={a.title}
                meta={ago(format, a.matchedAt)}
                pill={a.severity}
                pillTone={a.severity === "critical" ? "danger" : "muted"}
              />
            ))}
            {data.topAlerts.length === 0 && (
              <p className="px-2 py-1 text-[11px] text-muted">{t("noNewAlerts")}</p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function InboxCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const t = useTranslations("regwatch.dashboard");
  const items = [...data.inbox.obligationReviews, ...data.inbox.docReviews].slice(0, 4);
  return (
    <Card title={t("reviewerInbox")} href="/regwatch/comply/inbox" accent="violet">
      {isFree ? (
        <SetupState
          text={t("inboxFreeSetup")}
          ctaLabel={t("upgradeTeam")}
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : items.length === 0 ? (
        <p className="py-3 text-xs text-brand-teal">{t("inboxZero")}</p>
      ) : (
        <>
          <Stat value={data.inbox.total} label={t("awaitingYou")} tone="warn" />
          <div className="-mx-2 mt-2">
            {items.map((it) => (
              <RowLink
                key={`${it.kind}-${it.id}`}
                href={it.href}
                title={it.title}
                pill={it.state.replace(/[-_]/g, " ")}
                pillTone="muted"
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function ObligationsCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const t = useTranslations("regwatch.dashboard");
  const o = data.obligations;
  return (
    <Card title={t("obligations")} href="/regwatch/obligations" accent="amber">
      {isFree ? (
        <SetupState
          text={t("oblFreeSetup")}
          ctaLabel={t("upgradeTeam")}
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : o.total === 0 ? (
        <SetupState
          text={t("oblSetup")}
          ctaLabel={t("createObligation")}
          ctaHref="/regwatch/obligations"
        />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat value={o.nonCompliant} label={t("nonCompliant")} tone={o.nonCompliant > 0 ? "danger" : "default"} />
            <Stat value={o.atRisk} label={t("atRisk")} tone={o.atRisk > 0 ? "warn" : "default"} />
            <Stat value={o.overdue} label={t("overdue")} tone={o.overdue > 0 ? "danger" : "default"} />
          </div>
          <StackedBar
            segments={[
              { value: o.compliant, className: "bg-brand-teal", label: t("compliant") },
              { value: o.atRisk, className: "bg-amber-400", label: t("atRisk") },
              { value: o.nonCompliant, className: "bg-red-500", label: t("nonCompliant") },
              { value: o.unknown, className: "bg-card-border", label: t("unknown") },
            ]}
          />
          <p className="mt-2 text-[11px] text-muted">
            {t("oblSummary", { count: o.total, compliant: o.compliant })}
          </p>
        </>
      )}
    </Card>
  );
}

function AssetsCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const t = useTranslations("regwatch.dashboard");
  return (
    <Card title={t("assets")} href="/regwatch/assets" accent="teal">
      {isFree ? (
        <SetupState
          text={t("assetsFreeSetup")}
          ctaLabel={t("upgradeTeam")}
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : data.assets.total === 0 ? (
        <SetupState
          text={t("assetsSetup")}
          ctaLabel={t("buildHierarchy")}
          ctaHref="/regwatch/assets"
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={data.assets.total} label={t("assets")} />
            <Stat value={data.assets.byLevel[4] ?? 0} label={t("sites")} />
            <Stat
              value={data.hotAssets.length}
              label={t("hotAssets")}
              tone={data.hotAssets.length > 0 ? "danger" : "default"}
            />
          </div>
          <div className="-mx-2 mt-auto">
            {data.hotAssets.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-brand-teal">{t("noHotAssets")}</p>
            ) : (
              data.hotAssets.map((a) => (
                <RowLink
                  key={a.id}
                  href={`/regwatch/assets?asset=${a.id}`}
                  title={a.name}
                  meta={t(ASSET_LEVEL_KEY[a.level] ?? "levelComponent")}
                  pill={a.nonCompliant > 0 ? t("openPill", { count: a.nonCompliant }) : a.worstSeverity}
                  pillTone="danger"
                />
              ))
            )}
          </div>
        </>
      )}
    </Card>
  );
}

async function DocumentsCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const t = await getTranslations("regwatch.dashboard");
  const format = await getFormatter();
  const d = data.docs;
  return (
    <Card title={t("companyDocuments")} href="/regwatch/documents" accent="teal">
      {isFree ? (
        <SetupState
          text={t("docsFreeSetup")}
          ctaLabel={t("upgradeTeam")}
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : d.total === 0 ? (
        <SetupState
          text={t("docsSetup")}
          ctaLabel={t("newDocument")}
          ctaHref="/regwatch/documents"
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={d.inReview} label={t("inReview")} tone={d.inReview > 0 ? "warn" : "default"} />
            <Stat value={d.openComments} label={t("openComments")} tone={d.openComments > 0 ? "warn" : "default"} />
            <Stat
              value={d.dueForReview.length}
              label={t("dueForReview")}
              tone={d.dueForReview.length > 0 ? "danger" : "default"}
            />
          </div>
          <div className="-mx-2 mt-auto">
            {d.dueForReview.length > 0
              ? d.dueForReview.slice(0, 3).map((doc) => (
                  <RowLink
                    key={doc.id}
                    href={`/regwatch/documents/${doc.id}`}
                    title={doc.title}
                    meta={t("reviewMeta", { time: ago(format, doc.nextReviewDate) })}
                    pillTone="danger"
                  />
                ))
              : d.recent.slice(0, 3).map((doc) => (
                  <RowLink
                    key={doc.id}
                    href={`/regwatch/documents/${doc.id}`}
                    title={doc.title}
                    meta={ago(format, doc.updatedAt)}
                    pill={doc.reviewState.replace(/[-_]/g, " ")}
                    pillTone="muted"
                  />
                ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* ──────────────────────── Activity ──────────────────────── */

async function RecentActivity({ data }: { data: DashboardData }) {
  const t = await getTranslations("regwatch.dashboard");
  const format = await getFormatter();
  if (data.activity.length === 0) return null;
  return (
    <Card title={t("recentActivity")} accent="violet">
      <ul className="-mx-1 space-y-0.5">
        {data.activity.map((e) => (
          <li key={e.id}>
            <Link
              href={e.href}
              className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-card-bg/60"
            >
              <span
                className={`mt-0.5 h-1.5 w-1.5 shrink-0 self-center rounded-full ${
                  e.kind === "doc" ? "bg-brand-teal" : "bg-amber-400"
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-foreground">
                {e.actor && <span className="text-muted">{e.actor} </span>}
                {e.action} <span className="font-medium">{e.target}</span>
              </span>
              <span className="shrink-0 text-[10px] text-muted">{ago(format, e.when)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
