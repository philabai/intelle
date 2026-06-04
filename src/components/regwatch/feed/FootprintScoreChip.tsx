import type { Severity } from "@/lib/regwatch/match";

interface Props {
  score: number;
  severity: Severity;
  size?: "sm" | "md";
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-500/15 border-red-500/40 text-red-300",
  high: "bg-amber-400/15 border-amber-400/40 text-amber-300",
  normal: "bg-brand-teal/15 border-brand-teal/40 text-brand-teal",
  low: "bg-muted/15 border-card-border text-muted",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  normal: "Relevant",
  low: "Low",
};

export function FootprintScoreChip({ score, severity, size = "md" }: Props) {
  const styles = SEVERITY_STYLES[severity];
  const sized =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      title={`Footprint relevance ${score.toFixed(0)}/100 (${SEVERITY_LABEL[severity]})`}
      className={`inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wider ${styles} ${sized}`}
    >
      <span className="font-mono">{score.toFixed(0)}</span>
      <span>{SEVERITY_LABEL[severity]}</span>
    </span>
  );
}
