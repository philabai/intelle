import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNowStrict, format } from "date-fns";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership, listAssigneeOptions } from "@/lib/regwatch/members";
import { getObligation } from "@/lib/regwatch/obligations";
import { listObligationStateHistory } from "@/lib/regwatch/obligation-state-history";
import { getAsset, getHierarchyConfig } from "@/lib/regwatch/assets";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { ObligationWorkflow } from "@/components/regwatch/obligations/ObligationWorkflow";

interface Props {
  params: Promise<{ id: string }>;
}

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

export default async function ObligationDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/regwatch/login?next=/regwatch/obligations/${id}`);

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

  const obligation = await getObligation(id);
  if (!obligation) notFound();

  const [membership, org, history, asset, assignees] = await Promise.all([
    getMyMembership(),
    getMyOrganization(),
    listObligationStateHistory(id),
    getAsset(obligation.assetId),
    listAssigneeOptions(),
  ]);
  const isAdmin =
    membership?.role === "owner" || membership?.role === "admin";

  const config = await getHierarchyConfig(org?.organization.id ?? "");
  const levelLabel =
    (config[`level${obligation.assetLevel}Label` as keyof typeof config] as string | undefined) ??
    `L${obligation.assetLevel}`;

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/obligations" className="hover:text-foreground">
            Obligations
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{obligation.regulationCitation ?? "—"}</span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wider ${SEVERITY_BG[obligation.severity] ?? ""}`}
            >
              {obligation.severity}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wider ${STATUS_BG[obligation.complianceStatus] ?? ""}`}
            >
              {obligation.complianceStatus}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-medium uppercase tracking-wider ${REVIEW_BG[obligation.reviewStatus] ?? ""}`}
            >
              {obligation.reviewStatus}
            </span>
            {obligation.adminSignedOffAt && (
              <span className="text-muted">
                · signed off {format(new Date(obligation.adminSignedOffAt), "PP")}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {obligation.regulationTitle ?? "Obligation"}
          </h1>
          {obligation.regulationCitation && (
            <p className="mt-1 text-sm text-muted">
              <span className="font-mono">{obligation.regulationCitation}</span>
              {obligation.clauseAnchor && (
                <span className="ml-2">· clause {obligation.clauseAnchor}</span>
              )}
            </p>
          )}
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="space-y-6">
            {obligation.clauseText && (
              <section className="rounded-xl border border-card-border bg-card-bg/40 p-5">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-teal">
                  Clause text
                </h2>
                <p className="whitespace-pre-line text-sm text-foreground/90">
                  {obligation.clauseText}
                </p>
              </section>
            )}

            <section className="rounded-xl border border-card-border bg-card-bg/40 p-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-teal">
                Workflow
              </h2>
              <ObligationWorkflow
                obligationId={obligation.id}
                reviewStatus={obligation.reviewStatus}
                severity={obligation.severity}
                complianceStatus={obligation.complianceStatus}
                reviewCadence={obligation.reviewCadence}
                reviewCadenceCustomDays={obligation.reviewCadenceCustomDays}
                assignedReviewerUserId={obligation.assignedReviewerUserId}
                evidenceFilePath={obligation.evidenceFilePath}
                currentUserId={user.id}
                isAdmin={isAdmin}
                assignees={assignees}
              />
            </section>

            <section className="rounded-xl border border-card-border bg-card-bg/40 p-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-teal">
                State history
              </h2>
              {history.length === 0 ? (
                <p className="text-xs text-muted">No transitions recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="border-l-2 border-card-border pl-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-brand-navy/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                          {h.fromStatus ?? "created"}
                        </span>
                        <span className="text-muted">→</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${REVIEW_BG[h.toStatus] ?? ""}`}
                        >
                          {h.toStatus}
                        </span>
                        <span className="text-muted">·</span>
                        <span className="text-muted">
                          {h.actorName ?? h.actorEmail ?? "system"}
                        </span>
                        <span className="text-muted">·</span>
                        <span className="text-muted">
                          {formatDistanceToNowStrict(new Date(h.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {h.notes && (
                        <p className="mt-1 whitespace-pre-line text-xs text-foreground/80">
                          {h.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </article>

          <aside className="space-y-4">
            <section className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                Asset
              </h2>
              {asset ? (
                <div className="mt-2 text-sm">
                  <Link
                    href={`/regwatch/assets/${asset.id}`}
                    className="font-medium text-foreground hover:text-brand-teal"
                  >
                    {asset.name}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {levelLabel}
                    {asset.code && (
                      <>
                        {" · "}
                        <span className="font-mono">{asset.code}</span>
                      </>
                    )}
                  </p>
                  {asset.jurisdictionCode && (
                    <p className="text-[11px] text-muted">
                      Jurisdiction: {asset.jurisdictionCode}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">Asset not found.</p>
              )}
            </section>

            <section className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                Regulation
              </h2>
              {obligation.regulatoryItemId ? (
                <div className="mt-2 text-sm">
                  <p className="font-mono text-foreground">
                    {obligation.regulationCitation}
                  </p>
                  <p className="text-[11px] text-muted">
                    {obligation.regulationTitle}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs italic text-muted">
                  No regulation pinned.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
                Lifecycle
              </h2>
              <dl className="mt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Cadence</dt>
                  <dd className="text-foreground">
                    {obligation.reviewCadence === "custom"
                      ? `every ${obligation.reviewCadenceCustomDays ?? "?"} days`
                      : obligation.reviewCadence}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Attested until</dt>
                  <dd className="text-foreground">
                    {obligation.complianceAttestedUntil
                      ? format(
                          new Date(obligation.complianceAttestedUntil),
                          "PP",
                        )
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Review due</dt>
                  <dd className="text-foreground">
                    {obligation.reviewDueAt
                      ? format(new Date(obligation.reviewDueAt), "PP")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Created</dt>
                  <dd className="text-foreground">
                    {format(new Date(obligation.createdAt), "PP")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Updated</dt>
                  <dd className="text-foreground">
                    {format(new Date(obligation.updatedAt), "PP")}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </RegwatchAppShell>
  );
}
