import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/outreach/supabase/server";
import { loadGenerationConfig } from "@/lib/outreach/generation-config";

export const metadata = { title: "Review Queue — Outreach" };

const PLATFORM_BADGE: Record<string, string> = {
  linkedin: "in", x: "X", newsletter: "✉", youtube: "▶", reddit: "r/",
};

export default async function OutreachQueuePage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, status, target_platforms, target_geos, ai_confidence, created_at, pillar:content_pillars(name)")
    .in("status", ["pending_review", "under_review"])
    .order("created_at", { ascending: true });

  const rows = posts ?? [];
  const { qualityTarget } = await loadGenerationConfig();
  const barPct = Math.round(qualityTarget * 100);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-white">Review Queue</h1>
      <p className="mt-1 text-sm text-muted">
        {rows.length} draft{rows.length === 1 ? "" : "s"} awaiting approval. Oldest first.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-card-border bg-card-bg/40 p-10 text-center text-sm text-muted">
          Nothing to review. Drafts appear here as the generation cron runs (or generate one on demand).
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-card-border rounded-lg border border-card-border bg-card-bg">
          {rows.map((p) => {
            const pillar = Array.isArray(p.pillar) ? p.pillar[0] : p.pillar;
            const ageH = Math.round((Date.now() - new Date(p.created_at).getTime()) / 3.6e6);
            const conf = p.ai_confidence != null ? Math.round(Number(p.ai_confidence) * 100) : null;
            return (
              <li key={p.id}>
                <Link href={`/outreach/posts/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{p.title ?? "(untitled draft)"}</p>
                    <p className="text-xs text-muted">
                      {pillar?.name ?? "—"} · {(p.target_geos ?? []).join(", ") || "intl"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(p.target_platforms ?? []).map((pl: string) => (
                      <span key={pl} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted">
                        {PLATFORM_BADGE[pl] ?? pl}
                      </span>
                    ))}
                  </div>
                  {conf != null && (
                    <span className="flex items-center gap-1.5">
                      <span className={`text-xs ${conf >= barPct ? "text-brand-teal" : "text-amber-400"}`}>{conf}%</span>
                      {conf < barPct && (
                        <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-400">below bar</span>
                      )}
                    </span>
                  )}
                  <span className="w-14 text-end text-xs text-muted">{ageH}h ago</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
