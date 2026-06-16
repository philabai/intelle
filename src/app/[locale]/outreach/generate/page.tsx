export const metadata = { title: "Generate — Outreach" };

export default function OutreachGeneratePage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-white">AI Generation Workspace</h1>
      <p className="mt-1 text-sm text-muted">
        Brief the AI to draft a piece on demand — pick a pillar + seed, target platforms, geo and
        persona, then generate. Drafts flow into the review queue.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-card-border bg-card-bg/40 p-10 text-center text-sm text-muted">
        The generation workspace lands in Phase 1.
      </div>
    </div>
  );
}
