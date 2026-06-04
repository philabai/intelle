import { statusLabel } from "@/lib/regwatch/taxonomy";

const STATUS_STYLES: Record<string, string> = {
  "in-force": "bg-brand-teal/10 text-brand-teal border-brand-teal/40",
  "amended": "bg-brand-violet/10 text-brand-violet border-brand-violet/40",
  "proposed": "bg-amber-400/10 text-amber-300 border-amber-400/40",
  "consultation-open": "bg-amber-400/10 text-amber-300 border-amber-400/40",
  "consultation-closed": "bg-muted/10 text-muted border-card-border",
  "superseded": "bg-muted/10 text-muted border-card-border",
  "repealed": "bg-red-500/10 text-red-300 border-red-500/40",
};

export function StatusChip({ status }: { status: string }) {
  const styles = STATUS_STYLES[status] ?? "bg-card-bg text-muted border-card-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles}`}
    >
      {statusLabel(status)}
    </span>
  );
}
