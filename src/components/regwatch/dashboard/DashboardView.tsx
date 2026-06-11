import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import type { DashboardData } from "@/lib/regwatch/dashboard-queries";
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

const ASSET_LEVEL_LABEL: Record<number, string> = {
  2: "Org",
  3: "Division",
  4: "Site",
  5: "Facility",
  6: "Component",
};

function ago(iso: string | null): string {
  if (!iso) return "";
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
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
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-card-border bg-card-bg/40 p-3 sm:grid-cols-4">
      <Stat
        value={data.feed.critical}
        label="Critical in scope"
        tone={data.feed.critical > 0 ? "danger" : "default"}
        href="/regwatch/monitor/today?severity=critical"
      />
      <Stat
        value={data.inbox.total}
        label="Reviews awaiting you"
        tone={data.inbox.total > 0 ? "warn" : "good"}
        href="/regwatch/comply/inbox"
      />
      <Stat
        value={data.obligations.overdue}
        label="Overdue obligations"
        tone={data.obligations.overdue > 0 ? "danger" : "default"}
        href="/regwatch/obligations"
      />
      <Stat
        value={data.feed.hits_30d}
        label="Deadlines ≤30 days"
        tone={data.feed.hits_30d > 0 ? "warn" : "default"}
        href="/regwatch/monitor/today?sort=deadline"
      />
    </div>
  );
}

function FocusCallout({ data }: { data: DashboardData }) {
  let text: string | null = null;
  let href = "/regwatch/monitor/today";
  if (data.feed.critical > 0) {
    text = `${data.feed.critical} critical regulation${data.feed.critical === 1 ? "" : "s"} in your scope need triage.`;
    href = "/regwatch/monitor/today?severity=critical";
  } else if (data.obligations.overdue > 0) {
    text = `${data.obligations.overdue} obligation${data.obligations.overdue === 1 ? " is" : "s are"} overdue for review.`;
    href = "/regwatch/obligations";
  } else if (data.obligations.highSeverityOpen > 0) {
    text = `${data.obligations.highSeverityOpen} high-severity obligation${data.obligations.highSeverityOpen === 1 ? " is" : "s are"} not yet compliant.`;
    href = "/regwatch/obligations";
  } else if (data.inbox.total > 0) {
    text = `${data.inbox.total} review${data.inbox.total === 1 ? " is" : "s are"} waiting on you.`;
    href = "/regwatch/comply/inbox";
  }
  if (!text) {
    return (
      <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
        ✓ You&rsquo;re on top of things — no critical items need attention right now.
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200 hover:bg-amber-500/10"
    >
      <span>
        <span className="mr-2">⚡</span>
        {text}
      </span>
      <span className="shrink-0 text-amber-300">Review →</span>
    </Link>
  );
}

function MyQueue({ data }: { data: DashboardData }) {
  const items = [...data.inbox.obligationReviews, ...data.inbox.docReviews].slice(0, 6);
  return (
    <Card title="My queue" href="/regwatch/comply/inbox" accent="violet">
      {items.length === 0 ? (
        <p className="py-2 text-xs text-brand-teal">✓ Nothing assigned to you right now.</p>
      ) : (
        <div className="-mx-2">
          {items.map((it) => (
            <RowLink
              key={`${it.kind}-${it.id}`}
              href={it.href}
              title={it.title}
              meta={it.dueAt ? `due ${ago(it.dueAt)}` : undefined}
              pill={it.kind === "doc-review" ? "Doc" : "Obligation"}
              pillTone={it.kind === "doc-review" ? "good" : "warn"}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function PostureCard({ data }: { data: DashboardData }) {
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
    <Card title="Compliance posture" href="/regwatch/obligations" accent="teal">
      {o.total === 0 ? (
        <SetupState
          text="No obligations yet — pin regulations to your assets to track compliance."
          ctaLabel="Create an obligation"
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
            <span className="pb-1 text-xs text-muted">/ 100 posture</span>
          </div>
          <StackedBar
            segments={[
              { value: o.compliant, className: "bg-brand-teal", label: "Compliant" },
              { value: o.atRisk, className: "bg-amber-400", label: "At risk" },
              { value: o.nonCompliant, className: "bg-red-500", label: "Non-compliant" },
              { value: o.unknown, className: "bg-card-border", label: "Unknown" },
            ]}
          />
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <PostureLine n={o.compliant} label="Compliant" dot="bg-brand-teal" />
            <PostureLine n={o.atRisk} label="At risk" dot="bg-amber-400" />
            <PostureLine n={o.nonCompliant} label="Non-compliant" dot="bg-red-500" />
            <PostureLine n={o.unknown} label="Unknown" dot="bg-card-border" />
          </dl>
          {o.overdue > 0 && (
            <p className="mt-3 text-[11px] text-red-300">
              {o.overdue} review{o.overdue === 1 ? "" : "s"} overdue
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
  return (
    <Card title="Regulations" href="/regwatch/browse" accent="blue">
      {!data.hasFootprint ? (
        <SetupState
          text="Configure your footprint so we can scope the corpus to what applies to you."
          ctaLabel="Set up footprint"
          ctaHref="/regwatch/settings/footprint"
        />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat value={data.feed.total} label="In your scope" />
            <Stat value={data.coverage.regulators} label="Regulators" />
            <Stat value={data.coverage.topics} label="Topics" />
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5">
            {[
              ["Browse", "/regwatch/browse"],
              ["Search", "/regwatch/search"],
              ["Regulators", "/regwatch/regulators"],
              ["Topics", "/regwatch/topics"],
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

function MonitorCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  return (
    <Card
      title="Monitor"
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
          text="The Relevance Feed + alerts are a Team feature."
          ctaLabel="Upgrade to Team"
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : !data.hasFootprint ? (
        <SetupState
          text="Configure your footprint to start scoring incoming regulations."
          ctaLabel="Set up footprint"
          ctaHref="/regwatch/settings/footprint"
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={data.alertsUnseen} label="Unseen alerts" tone={data.alertsUnseen > 0 ? "warn" : "default"} />
            <Stat value={data.feed.critical} label="Critical" tone={data.feed.critical > 0 ? "danger" : "default"} />
            <Stat value={data.feed.high} label="High" />
          </div>
          <div className="-mx-2 mt-auto">
            {data.topAlerts.slice(0, 3).map((a) => (
              <RowLink
                key={a.matchId}
                href={`/regwatch/r/${a.jurisdictionCode.toLowerCase()}/${a.slug}`}
                title={a.title}
                meta={ago(a.matchedAt)}
                pill={a.severity}
                pillTone={a.severity === "critical" ? "danger" : "muted"}
              />
            ))}
            {data.topAlerts.length === 0 && (
              <p className="px-2 py-1 text-[11px] text-muted">No new alerts.</p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function InboxCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const items = [...data.inbox.obligationReviews, ...data.inbox.docReviews].slice(0, 4);
  return (
    <Card title="Reviewer inbox" href="/regwatch/comply/inbox" accent="violet">
      {isFree ? (
        <SetupState
          text="Reviewer workflows are a Team feature."
          ctaLabel="Upgrade to Team"
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : items.length === 0 ? (
        <p className="py-3 text-xs text-brand-teal">✓ Inbox zero — nothing awaiting your review.</p>
      ) : (
        <>
          <Stat value={data.inbox.total} label="Awaiting you" tone="warn" />
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
  const o = data.obligations;
  return (
    <Card title="Obligations" href="/regwatch/obligations" accent="amber">
      {isFree ? (
        <SetupState
          text="Compliance obligations are a Team feature."
          ctaLabel="Upgrade to Team"
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : o.total === 0 ? (
        <SetupState
          text="Pin a regulation to an asset to create your first obligation."
          ctaLabel="Create an obligation"
          ctaHref="/regwatch/obligations"
        />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat value={o.nonCompliant} label="Non-compliant" tone={o.nonCompliant > 0 ? "danger" : "default"} />
            <Stat value={o.atRisk} label="At risk" tone={o.atRisk > 0 ? "warn" : "default"} />
            <Stat value={o.overdue} label="Overdue" tone={o.overdue > 0 ? "danger" : "default"} />
          </div>
          <StackedBar
            segments={[
              { value: o.compliant, className: "bg-brand-teal", label: "Compliant" },
              { value: o.atRisk, className: "bg-amber-400", label: "At risk" },
              { value: o.nonCompliant, className: "bg-red-500", label: "Non-compliant" },
              { value: o.unknown, className: "bg-card-border", label: "Unknown" },
            ]}
          />
          <p className="mt-2 text-[11px] text-muted">
            {o.total} obligation{o.total === 1 ? "" : "s"} · {o.compliant} compliant
          </p>
        </>
      )}
    </Card>
  );
}

function AssetsCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  return (
    <Card title="Assets" href="/regwatch/assets" accent="teal">
      {isFree ? (
        <SetupState
          text="The asset hierarchy is a Team feature."
          ctaLabel="Upgrade to Team"
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : data.assets.total === 0 ? (
        <SetupState
          text="Model your operations — sites, facilities, equipment — to anchor obligations."
          ctaLabel="Build asset hierarchy"
          ctaHref="/regwatch/assets"
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={data.assets.total} label="Assets" />
            <Stat value={data.assets.byLevel[4] ?? 0} label="Sites" />
            <Stat
              value={data.hotAssets.length}
              label="Hot assets"
              tone={data.hotAssets.length > 0 ? "danger" : "default"}
            />
          </div>
          <div className="-mx-2 mt-auto">
            {data.hotAssets.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-brand-teal">
                ✓ No assets with open high-risk obligations.
              </p>
            ) : (
              data.hotAssets.map((a) => (
                <RowLink
                  key={a.id}
                  href={`/regwatch/assets?asset=${a.id}`}
                  title={a.name}
                  meta={ASSET_LEVEL_LABEL[a.level]}
                  pill={a.nonCompliant > 0 ? `${a.nonCompliant} open` : a.worstSeverity}
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

function DocumentsCard({ data, isFree }: { data: DashboardData; isFree: boolean }) {
  const d = data.docs;
  return (
    <Card title="Company documents" href="/regwatch/documents" accent="teal">
      {isFree ? (
        <SetupState
          text="Authoring SOPs, policies & permits is a Team feature."
          ctaLabel="Upgrade to Team"
          ctaHref="/regwatch/settings/billing"
          locked
        />
      ) : d.total === 0 ? (
        <SetupState
          text="Author your first SOP, policy or permit in the editor."
          ctaLabel="New document"
          ctaHref="/regwatch/documents"
        />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={d.inReview} label="In review" tone={d.inReview > 0 ? "warn" : "default"} />
            <Stat value={d.openComments} label="Open comments" tone={d.openComments > 0 ? "warn" : "default"} />
            <Stat
              value={d.dueForReview.length}
              label="Due for review"
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
                    meta={`review ${ago(doc.nextReviewDate)}`}
                    pillTone="danger"
                  />
                ))
              : d.recent.slice(0, 3).map((doc) => (
                  <RowLink
                    key={doc.id}
                    href={`/regwatch/documents/${doc.id}`}
                    title={doc.title}
                    meta={ago(doc.updatedAt)}
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

function RecentActivity({ data }: { data: DashboardData }) {
  if (data.activity.length === 0) return null;
  return (
    <Card title="Recent activity" accent="violet">
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
              <span className="shrink-0 text-[10px] text-muted">{ago(e.when)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
