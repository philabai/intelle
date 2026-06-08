import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { listAssets, getHierarchyConfig } from "@/lib/regwatch/assets";
import { listObligations, type ObligationListItem } from "@/lib/regwatch/obligations";
import { listAssigneeOptions } from "@/lib/regwatch/members";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { CreateObligationForm } from "@/components/regwatch/obligations/CreateObligationForm";

export const metadata = { title: "Obligations" };
export const dynamic = "force-dynamic";

const SEVERITY_BG: Record<string, string> = {
  catastrophic: "bg-red-600/30 text-red-100",
  critical: "bg-red-500/25 text-red-200",
  moderate: "bg-amber-500/25 text-amber-200",
  marginal: "bg-brand-blue/20 text-foreground",
  negligible: "bg-muted/20 text-muted",
};

const STATUS_BG: Record<string, string> = {
  "non-compliant": "bg-red-500/20 text-red-200",
  "at-risk": "bg-amber-500/20 text-amber-200",
  compliant: "bg-brand-teal/20 text-brand-teal",
  unknown: "bg-muted/20 text-muted",
};

const REVIEW_BG: Record<string, string> = {
  open: "bg-muted/20 text-muted",
  "awaiting-triage": "bg-brand-blue/20 text-foreground",
  "in-review": "bg-amber-500/20 text-amber-200",
  "pending-approval": "bg-brand-violet/30 text-foreground",
  verified: "bg-brand-teal/20 text-brand-teal",
  closed: "bg-muted/15 text-muted",
  "not-applicable": "bg-muted/15 text-muted",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ObligationsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/obligations");

  const gate = await checkFeatureGate("compliance_obligations");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="compliance_obligations"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
        />
      </RegwatchAppShell>
    );
  }

  const filter = typeof raw.filter === "string" ? raw.filter : "all";
  const filters =
    filter === "mine"
      ? { assignedToMe: true as const }
      : filter === "open"
        ? { reviewStatus: "open-all" as const }
        : {};

  const [org, membership, obligations, flatAssets, assignees] = await Promise.all([
    getMyOrganization(),
    getMyMembership(),
    listObligations(filters, 200),
    listAssets(),
    listAssigneeOptions(),
  ]);
  const config = await getHierarchyConfig(org?.organization.id ?? "");

  const canCreate =
    membership?.role === "owner" || membership?.role === "admin";

  const labels: Record<2 | 3 | 4 | 5 | 6, string> = {
    2: config.level2Label,
    3: config.level3Label,
    4: config.level4Label,
    5: config.level5Label,
    6: config.level6Label ?? "Component",
  };

  const filterChips: { value: string; label: string; count: number }[] = [
    { value: "all", label: "All", count: obligations.length },
    {
      value: "open",
      label: "Open",
      count: obligations.filter((o) =>
        ["open", "awaiting-triage", "in-review", "pending-approval"].includes(
          o.reviewStatus,
        ),
      ).length,
    },
    {
      value: "mine",
      label: "Assigned to me",
      count: obligations.filter((o) => o.assignedReviewerUserId === user.id)
        .length,
    },
  ];

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Obligations</span>
        </nav>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? "Your organization"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Compliance obligations
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Each obligation pins one regulation (or clause) to one asset and
              routes it through review. Admins set severity + compliance status
              and sign off; reviewers complete the review with evidence.
            </p>
          </div>
        </header>

        {canCreate && (
          <section className="mb-8 rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
            <header className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Create an obligation
              </h2>
              <p className="mt-1 text-xs text-muted">
                Pick an asset and a regulation; optionally pin to a clause.
                Severity and compliance status can be revised any time before
                sign-off — only admins can change them.
              </p>
            </header>
            <CreateObligationForm
              assets={flatAssets.map((a) => ({
                id: a.id,
                parentId: a.parentId,
                level: a.level,
                name: a.name,
                code: a.code,
              }))}
              levelLabels={labels}
              assignees={assignees}
            />
          </section>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {filterChips.map((c) => (
            <Link
              key={c.value}
              href={`/regwatch/obligations?filter=${c.value}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === c.value
                  ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                  : "border-card-border bg-card-bg text-foreground hover:border-brand-blue"
              }`}
            >
              {c.label} · {c.count}
            </Link>
          ))}
        </div>

        {obligations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-sm text-muted">
            No obligations yet for this filter.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-card-border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b border-card-border bg-card-bg/40 text-left text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Regulation</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Assigned to</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((o) => (
                  <ObligationRow key={o.id} o={o} labels={labels} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RegwatchAppShell>
  );
}

function ObligationRow({
  o,
  labels,
}: {
  o: ObligationListItem;
  labels: Record<2 | 3 | 4 | 5 | 6, string>;
}) {
  return (
    <tr className="border-b border-card-border last:border-0 hover:bg-card-bg/50">
      <td className="px-4 py-3">
        <Link
          href={`/regwatch/obligations/${o.id}`}
          className="hover:text-brand-teal"
        >
          {o.regulationCitation ? (
            <>
              <span className="font-mono text-foreground">
                {o.regulationCitation}
              </span>
              {o.clauseAnchor && (
                <span className="ml-1 text-[10px] text-muted">
                  · {o.clauseAnchor}
                </span>
              )}
              <p className="line-clamp-1 text-[11px] text-muted">
                {o.regulationTitle}
              </p>
            </>
          ) : (
            <span className="italic text-muted">No regulation pinned</span>
          )}
        </Link>
      </td>
      <td className="px-4 py-3 text-xs">
        <Link
          href={`/regwatch/assets/${o.assetId}`}
          className="text-foreground hover:text-brand-teal"
        >
          {o.assetName}
        </Link>
        <p className="text-[10px] uppercase tracking-wider text-muted">
          {labels[o.assetLevel as 2 | 3 | 4 | 5 | 6] ?? `L${o.assetLevel}`}
        </p>
      </td>
      <td className="px-4 py-3 text-xs">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${SEVERITY_BG[o.severity] ?? ""}`}
        >
          {o.severity}
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_BG[o.complianceStatus] ?? ""}`}
        >
          {o.complianceStatus}
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${REVIEW_BG[o.reviewStatus] ?? ""}`}
        >
          {o.reviewStatus}
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        {o.assignedReviewerName ? (
          <span className="text-foreground">{o.assignedReviewerName}</span>
        ) : o.assignedReviewerUserId ? (
          <span className="text-muted">Assigned</span>
        ) : (
          <span className="text-[11px] italic text-muted/60">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted">
        {formatDistanceToNowStrict(new Date(o.updatedAt), { addSuffix: true })}
      </td>
    </tr>
  );
}
