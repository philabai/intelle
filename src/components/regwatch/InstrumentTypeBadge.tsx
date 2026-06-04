import { instrumentTypeLabel } from "@/lib/regwatch/taxonomy";

export function InstrumentTypeBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-card-border bg-card-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
      {instrumentTypeLabel(value)}
    </span>
  );
}
