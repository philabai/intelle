import { Link } from "@/i18n/navigation";
import type { FeedItem } from "@/lib/regwatch/feed-queries";
import { FootprintScoreChip } from "./FootprintScoreChip";

interface Props {
  items: FeedItem[];
}

/**
 * Sticky 30 / 60 / 90 day deadline strip from A.3. Buckets the approaching
 * deadlines by horizon, then shows the highest-scoring item per bucket as a
 * compact card. Footprint-weighted urgency, not raw publication date.
 */
export function DeadlineStrip({ items }: Props) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const buckets: Record<"d30" | "d60" | "d90", FeedItem[]> = {
    d30: [],
    d60: [],
    d90: [],
  };
  for (const i of items) {
    const dl = i.item.consultation_closes_at ?? i.item.effective_date;
    if (!dl) continue;
    const diff = new Date(dl).getTime() - now;
    if (diff < 0) continue;
    if (diff <= 30 * day) buckets.d30.push(i);
    else if (diff <= 60 * day) buckets.d60.push(i);
    else if (diff <= 90 * day) buckets.d90.push(i);
  }
  const topPer = (bucket: FeedItem[]) =>
    bucket.length === 0
      ? null
      : [...bucket].sort((a, b) => b.score - a.score)[0];

  const cards: { window: string; count: number; top: FeedItem | null }[] = [
    { window: "30 days", count: buckets.d30.length, top: topPer(buckets.d30) },
    { window: "60 days", count: buckets.d60.length, top: topPer(buckets.d60) },
    { window: "90 days", count: buckets.d90.length, top: topPer(buckets.d90) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <DeadlineCard key={c.window} {...c} />
      ))}
    </div>
  );
}

function DeadlineCard({
  window: w,
  count,
  top,
}: {
  window: string;
  count: number;
  top: FeedItem | null;
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg/60 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
          Hitting in {w}
        </p>
        <span className="font-mono text-lg font-semibold text-foreground">
          {count}
        </span>
      </div>
      {top ? (
        <Link
          href={`/regwatch/r/${top.item.jurisdiction_code.toLowerCase()}/${top.item.slug}`}
          className="mt-2 block hover:text-brand-teal"
        >
          <div className="flex items-center gap-2">
            <FootprintScoreChip
              score={top.score}
              severity={top.severity}
              size="sm"
            />
            <span className="font-mono text-[10px] text-muted">
              {top.item.citation}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-foreground">
            {top.item.title}
          </p>
        </Link>
      ) : (
        <p className="mt-2 text-xs text-muted">No deadlines in this window.</p>
      )}
    </div>
  );
}
