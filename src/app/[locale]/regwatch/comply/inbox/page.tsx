import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getReviewerInbox, type InboxItem } from "@/lib/regwatch/reviewer-inbox";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";

export const metadata: Metadata = {
  title: "Reviewer Inbox — Vantage",
  description:
    "Every document review + obligation review awaiting you across the org, in one ranked list.",
};
export const dynamic = "force-dynamic";

/**
 * Reviewer Inbox — the single screen where a reviewer sees every
 * action waiting on them, regardless of whether it lives in
 * Documents or Obligations. Previously these were hidden inside
 * per-document / per-obligation detail pages so reviewers had to
 * remember what they'd been assigned to.
 */
export default async function ReviewerInboxPage() {
  const t = await getTranslations("regwatch.comply");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/comply/inbox");

  const bundle = await getReviewerInbox();

  return (
    <RegwatchAppShell authed>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/comply" className="hover:text-foreground">
              {t("breadcrumbComply")}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{t("inboxTitle")}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("inboxHeading", { count: bundle.total })}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {t("inboxSubheading")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <Section
          title={t("inboxDocReviewsTitle")}
          subtitle={t("inboxDocReviewsSubtitle")}
          items={bundle.docReviews}
          emptyLabel={t("inboxDocReviewsEmpty")}
        />
        <Section
          title={t("inboxObligationReviewsTitle")}
          subtitle={t("inboxObligationReviewsSubtitle")}
          items={bundle.obligationReviews}
          emptyLabel={t("inboxObligationReviewsEmpty")}
        />
      </div>
    </RegwatchAppShell>
  );
}

async function Section({
  title,
  subtitle,
  items,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  items: InboxItem[];
  emptyLabel: string;
}) {
  const t = await getTranslations("regwatch.comply");
  const format = await getFormatter();
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full border border-card-border bg-card-bg/60 px-2 py-0.5 text-[10px] font-medium text-muted">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-card-border bg-card-bg/30 p-6 text-center text-xs text-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-card-border overflow-hidden rounded-xl border border-card-border bg-background">
          {items.map((item) => (
            <li key={`${item.kind}::${item.id}`}>
              <Link
                href={item.href}
                className="block px-4 py-3 hover:bg-card-bg/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-blue">
                    {item.state.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{item.subtitle}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {t("inboxAssignedPrefix")}{" "}
                  {format.relativeTime(new Date(item.assignedAt))}
                  {item.dueAt && (
                    <>
                      {" · "}
                      {t("inboxDuePrefix")}{" "}
                      <span className="text-amber-300">
                        {format.dateTime(new Date(item.dueAt), { dateStyle: "medium" })}
                      </span>
                    </>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
