import { instrumentTypeLabel } from "@/lib/regwatch/taxonomy";

/**
 * Instrument-type badge. "Notice" items (press releases / regulator news from
 * the press-page connectors) get a distinct subdued amber treatment + a "News"
 * label so users can tell at-a-glance that they're not authoritative
 * regulations. Everything else uses the neutral muted style.
 */
export function InstrumentTypeBadge({ value }: { value: string }) {
  const isNews = value === "notice";
  const styles = isNews
    ? "border-amber-400/30 bg-amber-400/5 text-amber-300"
    : "border-card-border bg-card-bg text-muted";
  const label = isNews ? "News" : instrumentTypeLabel(value);
  return (
    <span
      title={
        isNews
          ? "Regulator news / press announcement — not the authoritative text. Cite the linked source if it underpins a regulation."
          : undefined
      }
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}
    >
      {label}
    </span>
  );
}
