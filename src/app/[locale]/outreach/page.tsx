import { createClient } from "@/lib/outreach/supabase/server";
import type { ContentPillar } from "@/lib/outreach/types";

export const metadata = { title: "Outreach — Vantage" };

export default async function OutreachDashboard() {
  const supabase = await createClient();
  const { data: pillars } = await supabase
    .from("content_pillars")
    .select("id, slug, name, weekly_post_target, active")
    .order("weekly_post_target", { ascending: false });
  const { count: pendingCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-white">Vantage Outreach</h1>
      <p className="mt-1 text-sm text-muted">
        AI-drafted, editor-reviewed brand content across LinkedIn, X, and the newsletter.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Pending review" value={pendingCount ?? 0} />
        <Stat label="Active pillars" value={(pillars ?? []).filter((p) => p.active).length} />
        <Stat label="Weekly target" value={(pillars ?? []).reduce((s, p) => s + p.weekly_post_target, 0)} />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Content pillars</h2>
      <ul className="mt-3 divide-y divide-card-border rounded-lg border border-card-border bg-card-bg">
        {(pillars ?? []).map((p: Pick<ContentPillar, "id" | "slug" | "name" | "weekly_post_target" | "active">) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-white">{p.name}</p>
              <p className="text-xs text-muted">{p.slug}</p>
            </div>
            <span className="text-xs text-muted">{p.weekly_post_target}/wk</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
