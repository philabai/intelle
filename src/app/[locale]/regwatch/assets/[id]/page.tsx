import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { formatDistanceToNowStrict } from "date-fns";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import {
  getAsset,
  getAssetAncestors,
  getAssetChildren,
  getHierarchyConfig,
} from "@/lib/regwatch/assets";
import { listObligations } from "@/lib/regwatch/obligations";
import {
  listDocumentsLinkedToAssetWithAncestors,
  DOCUMENT_KIND_LABEL,
} from "@/lib/regwatch/internal-documents";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";

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

const REVIEW_BG: Record<string, string> = {
  open: "bg-muted/20 text-muted",
  "awaiting-triage": "bg-brand-blue/20 text-foreground",
  "in-review": "bg-amber-500/20 text-amber-200",
  "pending-approval": "bg-brand-violet/30 text-foreground",
  verified: "bg-brand-teal/20 text-brand-teal",
  closed: "bg-muted/15 text-muted",
  "not-applicable": "bg-muted/15 text-muted",
};

export default async function AssetDetailPage({ params }: Props) {
  const t = await getTranslations("regwatch.comply");
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect(`/regwatch/login?next=/regwatch/assets/${id}`);

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

  const asset = await getAsset(id);
  if (!asset) notFound();

  const [org, ancestors, children, obligations] = await Promise.all([
    getMyOrganization(),
    getAssetAncestors(id),
    getAssetChildren(id),
    listObligations({ assetId: id }, 100),
  ]);
  const linkedDocs = await listDocumentsLinkedToAssetWithAncestors(
    id,
    ancestors.map((a) => a.id),
  );

  const config = await getHierarchyConfig(org?.organization.id ?? "");
  const labels: Record<2 | 3 | 4 | 5 | 6, string> = {
    2: config.level2Label,
    3: config.level3Label,
    4: config.level4Label,
    5: config.level5Label,
    6: config.level6Label ?? t("levelComponentFallback"),
  };
  const levelLabel = labels[asset.level as 2 | 3 | 4 | 5 | 6];

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/assets" className="hover:text-foreground">
            {t("assetsTitle")}
          </Link>
          {ancestors.map((a) => (
            <span key={a.id}>
              <span className="mx-2">/</span>
              <Link
                href={`/regwatch/assets/${a.id}`}
                className="hover:text-foreground"
              >
                {a.name}
              </Link>
            </span>
          ))}
          <span className="mx-2">/</span>
          <span className="text-foreground">{asset.name}</span>
        </nav>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {levelLabel}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {asset.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            {asset.code && <span className="font-mono">{asset.code}</span>}
            {asset.assetType && <span>· {t("typeLabel")}: {asset.assetType}</span>}
            {asset.jurisdictionCode && (
              <span>· {t("jurisdictionLabelLower")}: {asset.jurisdictionCode}</span>
            )}
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <article className="space-y-6">
            {/* Compliance obligations attached to this asset */}
            <section className="rounded-xl border border-card-border bg-card-bg/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("complianceObligations")}
                </h2>
                <Link
                  href={`/regwatch/obligations?filter=all`}
                  className="text-xs text-brand-teal hover:underline"
                >
                  {t("manageInDashboard")}
                </Link>
              </div>
              {obligations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
                  {t("noObligationsPinned")}
                </p>
              ) : (
                <ul className="divide-y divide-card-border">
                  {obligations.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/regwatch/obligations/${o.id}`}
                          className="text-sm text-foreground hover:text-brand-teal"
                        >
                          {o.regulationCitation ? (
                            <>
                              <span className="font-mono">
                                {o.regulationCitation}
                              </span>
                              {o.clauseAnchor && (
                                <span className="ms-1 text-[10px] text-muted">
                                  · {o.clauseAnchor}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="italic text-muted">
                              {t("noRegulation")}
                            </span>
                          )}
                        </Link>
                        <p className="line-clamp-1 text-[11px] text-muted">
                          {o.regulationTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${SEVERITY_BG[o.severity] ?? ""}`}
                        >
                          {o.severity}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${REVIEW_BG[o.reviewStatus] ?? ""}`}
                        >
                          {o.reviewStatus}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Company documents linked to this asset (or any ancestor) */}
            <section className="rounded-xl border border-card-border bg-card-bg/40 p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {t("companyDocuments")}
              </h2>
              {linkedDocs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-4 text-center text-xs text-muted">
                  {t("noDocumentsLinked")}
                </p>
              ) : (
                <ul className="divide-y divide-card-border">
                  {linkedDocs.map((d) => (
                    <li
                      key={d.linkId}
                      className="flex items-start justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/regwatch/documents/${d.documentId}`}
                          className="text-sm font-medium text-foreground hover:text-brand-teal"
                        >
                          {d.title}
                        </Link>
                        <p className="text-[11px] text-muted">
                          {DOCUMENT_KIND_LABEL[d.docKind]}
                          {d.internalCode && (
                            <>
                              {" · "}
                              <span className="font-mono">{d.internalCode}</span>
                            </>
                          )}
                          {d.version && <> · {d.version}</>}
                        </p>
                        {d.inheritedFromAssetId && d.inheritedFromAssetName && (
                          <p className="mt-0.5 text-[10px] text-amber-300">
                            {t.rich("inheritedFrom", {
                              name: d.inheritedFromAssetName,
                              link: (c) => (
                                <Link
                                  href={`/regwatch/assets/${d.inheritedFromAssetId}`}
                                  className="underline"
                                >
                                  {c}
                                </Link>
                              ),
                            })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </article>

          <aside className="space-y-4">
            {children.length > 0 && (
              <section className="rounded-xl border border-card-border bg-card-bg p-4">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                  {t("childrenCount", { count: children.length })}
                </h2>
                <ul className="space-y-1.5">
                  {children.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/regwatch/assets/${c.id}`}
                        className="block rounded-md px-2 py-1.5 text-xs hover:bg-brand-navy/30"
                      >
                        <span className="font-medium text-foreground">
                          {c.name}
                        </span>
                        {c.code && (
                          <span className="ms-2 font-mono text-[10px] text-muted">
                            {c.code}
                          </span>
                        )}
                        <p className="text-[10px] uppercase tracking-wider text-muted">
                          {labels[c.level as 2 | 3 | 4 | 5 | 6] ?? `L${c.level}`}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-xl border border-card-border bg-card-bg p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                {t("lifecycle")}
              </h2>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-muted">{t("created")}</dt>
                  <dd className="text-foreground">
                    {formatDistanceToNowStrict(new Date(asset.createdAt), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{t("updated")}</dt>
                  <dd className="text-foreground">
                    {formatDistanceToNowStrict(new Date(asset.updatedAt), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
                {asset.archivedAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted">{t("archived")}</dt>
                    <dd className="text-amber-300">
                      {formatDistanceToNowStrict(new Date(asset.archivedAt), {
                        addSuffix: true,
                      })}
                    </dd>
                  </div>
                )}
              </dl>
              <Link
                href="/regwatch/assets/setup"
                className="mt-3 inline-block rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue"
              >
                {t("editTree")}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </RegwatchAppShell>
  );
}
