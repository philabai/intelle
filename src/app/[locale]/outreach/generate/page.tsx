import { getWeeklyPillarStatus } from "@/lib/outreach/weekly-status";
import { GenerateForm } from "@/components/outreach/GenerateForm";

export const metadata = { title: "Generate — Outreach" };
// Generation runs after the response via after(); give the function headroom.
export const maxDuration = 300;

export default async function OutreachGeneratePage() {
  const { pillars, weekStart } = await getWeeklyPillarStatus();
  const active = pillars.filter((p) => p.active);
  const weekLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(weekStart));
  const totalRemaining = active.reduce((n, p) => n + p.remaining, 0);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">AI Generation Workspace</h1>
      <p className="mt-1 text-sm text-muted">
        Brief the AI to draft a piece on demand. It uses the next unused seed for the pillar (or your
        brief alone). Drafts land in the review queue as <span className="text-white">pending_review</span> —
        nothing publishes without approval.
      </p>

      {/* Weekly quota tracker */}
      <div className="mt-5 rounded-lg border border-card-border bg-card-bg p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">This week (from {weekLabel})</p>
          <p className="text-xs text-muted">{totalRemaining === 0 ? "All targets met 🎉" : `${totalRemaining} post${totalRemaining === 1 ? "" : "s"} to go`}</p>
        </div>
        <div className="space-y-2">
          {active.map((p) => {
            const pct = p.weeklyTarget > 0 ? Math.min(100, Math.round((p.thisWeek / p.weeklyTarget) * 100)) : 100;
            const done = p.remaining === 0;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-48 shrink-0 truncate text-sm text-white">{p.name}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                  <div className={`h-full ${done ? "bg-brand-teal" : "bg-brand-blue"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-28 shrink-0 text-right text-xs text-muted">
                  <span className={done ? "text-brand-teal" : "text-white"}>{p.thisWeek}/{p.weeklyTarget}</span>
                  {!done && <span className="text-amber-400"> · {p.remaining} to go</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GenerateForm
        pillars={active.map((p) => ({ id: p.id, name: p.name, seeds: p.seedsAvailable, remaining: p.remaining }))}
      />
    </div>
  );
}
