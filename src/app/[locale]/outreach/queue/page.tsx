export const metadata = { title: "Review Queue — Outreach" };

export default function OutreachQueuePage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-white">Review Queue</h1>
      <p className="mt-1 text-sm text-muted">
        AI-drafted content waiting for editor approval before it publishes.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-card-border bg-card-bg/40 p-10 text-center text-sm text-muted">
        The draft inbox lands in Phase 1.
      </div>
    </div>
  );
}
