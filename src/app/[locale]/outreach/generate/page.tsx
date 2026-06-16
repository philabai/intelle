import { createClient } from "@/lib/outreach/supabase/server";
import { GenerateForm } from "@/components/outreach/GenerateForm";

export const metadata = { title: "Generate — Outreach" };

export default async function OutreachGeneratePage() {
  const supabase = await createClient();
  const { data: pillars } = await supabase
    .from("content_pillars")
    .select("id, name, slug, active")
    .eq("active", true)
    .order("name");

  // Count unconsumed seeds per pillar so the editor sees what's queued.
  const { data: seeds } = await supabase
    .from("content_seeds")
    .select("pillar_id")
    .eq("consumed", false);
  const seedCounts = new Map<string, number>();
  for (const s of seeds ?? []) {
    if (s.pillar_id) seedCounts.set(s.pillar_id, (seedCounts.get(s.pillar_id) ?? 0) + 1);
  }

  const options = (pillars ?? []).map((p) => ({ id: p.id, name: p.name, seeds: seedCounts.get(p.id) ?? 0 }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">AI Generation Workspace</h1>
      <p className="mt-1 text-sm text-muted">
        Brief the AI to draft a piece on demand. It uses the next unused seed for the pillar (or
        your brief alone). Drafts land in the review queue as <span className="text-white">pending_review</span> —
        nothing publishes without approval.
      </p>
      <GenerateForm pillars={options} />
    </div>
  );
}
