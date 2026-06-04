import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyFootprint, getMyOrganization } from "@/lib/regwatch/footprint";
import {
  listMyFeed,
  getMyFeedCounts,
  listApproachingDeadlines,
  type FeedSort,
} from "@/lib/regwatch/feed-queries";
import { listAssigneeOptions } from "@/lib/regwatch/members";
import type { Severity } from "@/lib/regwatch/match";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { DeadlineStrip } from "@/components/regwatch/feed/DeadlineStrip";
import { FeedRow } from "@/components/regwatch/feed/FeedRow";
import { FeedFilters } from "@/components/regwatch/feed/FeedFilters";
import { EmptyFeed } from "@/components/regwatch/feed/EmptyFeed";

export const metadata = { title: "Relevance Feed" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

const VALID_SORTS: FeedSort[] = ["score", "newest", "deadline", "recently_changed"];
const VALID_SEVERITIES: Severity[] = ["critical", "high", "normal", "low"];

export default async function FeedPage({ searchParams }: Props) {
  const raw = await searchParams;
  const sort = (pick(raw, "sort") as FeedSort) ?? "score";
  const severity = (pick(raw, "severity") as Severity) ?? undefined;
  const showResolved = pick(raw, "show_resolved") === "1";
  const assignedToMe = pick(raw, "assigned_to_me") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/feed");

  const [org, footprint, counts, items, deadlineItems, assigneeOptions] =
    await Promise.all([
      getMyOrganization(),
      getMyFootprint(),
      getMyFeedCounts(),
      listMyFeed({
        sort: VALID_SORTS.includes(sort) ? sort : "score",
        severity: severity && VALID_SEVERITIES.includes(severity) ? severity : undefined,
        hideResolved: !showResolved,
        assignedToMe,
        limit: 100,
      }),
      listApproachingDeadlines(),
      listAssigneeOptions(),
    ]);

  const hasFootprint = !!footprint?.is_configured;
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            As of {today}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {org?.organization.name ?? "Your"} Relevance Feed
          </h1>
          <p className="mt-2 text-sm text-muted">
            {counts.total === 0
              ? "Nothing scored yet — configure your footprint or wait for the matcher."
              : `${counts.total} regulations match your footprint · ${counts.critical} critical, ${counts.high} high.`}
          </p>
        </header>

        {hasFootprint && deadlineItems.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              Approaching deadlines
            </h2>
            <DeadlineStrip items={deadlineItems} />
          </section>
        )}

        {counts.total === 0 || !hasFootprint ? (
          <EmptyFeed hasFootprint={hasFootprint} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-card-border bg-background">
            <Suspense fallback={null}>
              <FeedFilters counts={counts} />
            </Suspense>
            {items.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted">
                No items match the current filter. Try Severity: &ldquo;Normal +&rdquo; or
                toggle Resolved.
              </p>
            ) : (
              items.map((item) => (
                <FeedRow
                  key={item.match_id}
                  feedItem={item}
                  assigneeOptions={assigneeOptions}
                />
              ))
            )}
          </div>
        )}
      </div>
    </RegwatchAppShell>
  );
}
