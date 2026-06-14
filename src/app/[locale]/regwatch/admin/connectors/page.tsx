import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyMembership } from "@/lib/regwatch/members";
import { REGWATCH_CONNECTORS } from "@/lib/regwatch/connectors";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RunConnectorRow } from "@/components/regwatch/admin/RunConnectorRow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("regwatch.widgets");
  return {
    title: t("connectorsMetaTitle"),
  };
}
export const dynamic = "force-dynamic";

/**
 * Org-admin-only ad-hoc connector runner. Same effect as the nightly
 * crawl cron but session-authed, so admins can fill a publisher's
 * data right after adding the connector without coordinating with
 * the cron secret holder.
 */
export default async function AdminConnectorsPage() {
  const t = await getTranslations("regwatch.widgets");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/admin/connectors");

  const membership = await getMyMembership();
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return (
      <RegwatchAppShell authed>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("connectorsAdminOnly")}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {t("connectorsAdminOnlyDesc")}
          </p>
          <Link
            href="/regwatch/comply"
            className="mt-6 inline-block rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-blue"
          >
            {t("connectorsBackToComply")}
          </Link>
        </div>
      </RegwatchAppShell>
    );
  }

  // Group connectors by publisher prefix so the list reads cleanly.
  const byPrefix = new Map<string, typeof REGWATCH_CONNECTORS>();
  for (const c of REGWATCH_CONNECTORS) {
    const prefix = c.id.split("-")[0];
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix)!.push(c);
  }

  return (
    <RegwatchAppShell authed>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/comply" className="hover:text-foreground">
              {t("connectorsComply")}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{t("connectorsBreadcrumb")}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("connectorsTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {t.rich("connectorsDescription", {
              code: (c) => (
                <code className="ms-1 rounded bg-card-bg px-1 font-mono text-[11px]">
                  {c}
                </code>
              ),
            })}
          </p>
          <p className="mt-2 max-w-2xl rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">
            {t("connectorsWarning")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {Array.from(byPrefix.entries()).map(([prefix, connectors]) => (
          <section key={prefix}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              {prefix.toUpperCase()} ({connectors.length})
            </h2>
            <ul className="space-y-2">
              {connectors.map((c) => (
                <RunConnectorRow
                  key={c.id}
                  connectorId={c.id}
                  label={c.label}
                  regulatorSlug={c.regulator_slug}
                  supportsHierarchy={typeof c.buildHierarchy === "function"}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </RegwatchAppShell>
  );
}
