import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/comply/inbox");

  const bundle = await getReviewerInbox();

  return (
    <RegwatchAppShell authed>
      <header className="border-b border-card-border bg-card-bg/30">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <nav className="text-xs text-muted">
            <Link href="/regwatch/comply" className="hover:text-foreground">
              Comply
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Reviewer Inbox</span>
          </nav>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reviewer Inbox · {bundle.total} pending
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Documents and obligations assigned to you across the org. Click
            any row to open the source for review.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <Section
          title="Document reviews"
          subtitle="Review / approve in-flight internal documents."
          items={bundle.docReviews}
          emptyLabel="No open document reviews assigned to you."
        />
        <Section
          title="Obligation reviews"
          subtitle="Compliance obligations awaiting your attestation + evidence."
          items={bundle.obligationReviews}
          emptyLabel="No open obligation reviews assigned to you."
        />
      </div>
    </RegwatchAppShell>
  );
}

function Section({
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
                  Assigned{" "}
                  {formatDistanceToNowStrict(new Date(item.assignedAt), {
                    addSuffix: true,
                  })}
                  {item.dueAt && (
                    <>
                      {" · Due "}
                      <span className="text-amber-300">
                        {new Date(item.dueAt).toLocaleDateString()}
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
