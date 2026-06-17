import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/outreach/supabase/server";

export const metadata = { title: "Calendar — Outreach" };

const DAY_MS = 86_400_000;
const PLATFORM_BADGE: Record<string, string> = { linkedin: "in", x: "X", newsletter: "✉" };
// "approved/scheduled" use non-green hues so only an actually-published post
// reads as green (avoids confusing "scheduled" with "published").
const STATUS_COLOR: Record<string, string> = {
  approved: "border-l-brand-violet", scheduled: "border-l-brand-blue",
  publishing: "border-l-amber-400", published: "border-l-emerald-500",
  pending_review: "border-l-muted", under_review: "border-l-muted", failed: "border-l-red-500",
};

function mondayOf(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function OutreachCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const anchor = week ? new Date(`${week}T00:00:00Z`) : new Date();
  const start = mondayOf(anchor);
  const end = new Date(start.getTime() + 7 * DAY_MS);

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, status, target_platforms, scheduled_for, pillar:content_pillars(name)")
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", start.toISOString())
    .lt("scheduled_for", end.toISOString())
    .order("scheduled_for", { ascending: true });

  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  const byDay = new Map<string, typeof posts>();
  for (const p of posts ?? []) {
    const key = isoDate(new Date(p.scheduled_for as string));
    const arr = byDay.get(key) ?? [];
    arr.push(p);
    byDay.set(key, arr);
  }

  const prevWeek = isoDate(new Date(start.getTime() - 7 * DAY_MS));
  const nextWeek = isoDate(end);
  const todayKey = isoDate(new Date());
  const fmt = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Editorial Calendar</h1>
          <p className="mt-1 text-sm text-muted">
            Week of {fmt.format(start)} · scheduled & published content across pillars and platforms.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/outreach/calendar?week=${prevWeek}`} className="rounded border border-card-border px-3 py-1 text-muted hover:text-white">← Prev</Link>
          <Link href="/outreach/calendar" className="rounded border border-card-border px-3 py-1 text-muted hover:text-white">Today</Link>
          <Link href={`/outreach/calendar?week=${nextWeek}`} className="rounded border border-card-border px-3 py-1 text-muted hover:text-white">Next →</Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const key = isoDate(d);
          const items = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} className={`min-h-40 rounded-lg border bg-card-bg p-2 ${isToday ? "border-brand-blue" : "border-card-border"}`}>
              <p className={`mb-2 text-xs font-medium ${isToday ? "text-brand-blue" : "text-muted"}`}>{fmt.format(d)}</p>
              <div className="space-y-2">
                {items.length === 0 && <p className="text-[11px] text-muted/50">—</p>}
                {items.map((p) => {
                  const pillar = Array.isArray(p.pillar) ? p.pillar[0] : p.pillar;
                  const time = new Date(p.scheduled_for as string).toISOString().slice(11, 16);
                  return (
                    <Link key={p.id} href={`/outreach/posts/${p.id}`}
                      className={`block rounded border-l-2 bg-background p-2 text-xs hover:bg-white/5 ${STATUS_COLOR[p.status] ?? "border-l-muted"}`}>
                      <p className="truncate text-white">{p.title ?? "(untitled)"}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                        <span>{time}</span>
                        <span>·</span>
                        <span className="truncate">{pillar?.name}</span>
                      </p>
                      <div className="mt-1 flex gap-1">
                        {(p.target_platforms ?? []).map((pl: string) => (
                          <span key={pl} className="rounded bg-white/10 px-1 text-[9px] text-muted">{PLATFORM_BADGE[pl] ?? pl}</span>
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        Legend: <span className="text-brand-violet">approved</span> · <span className="text-brand-blue">scheduled</span> ·{" "}
        <span className="text-amber-400">publishing</span> · <span className="text-emerald-500">published</span> ·{" "}
        <span className="text-red-500">failed</span>
      </p>
    </div>
  );
}
