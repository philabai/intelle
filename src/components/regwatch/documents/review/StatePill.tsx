import { useTranslations } from "next-intl";
import type { InternalDocumentReviewState } from "@/lib/regwatch/internal-documents";

const TONE: Record<InternalDocumentReviewState, string> = {
  draft: "bg-card-bg/60 text-muted border-card-border",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  approved: "bg-brand-blue/15 text-brand-blue border-brand-blue/40",
  effective: "bg-brand-teal/15 text-brand-teal border-brand-teal/40",
  superseded: "bg-card-bg/40 text-muted border-card-border line-through",
};

export function StatePill({
  state,
  size = "md",
}: {
  state: InternalDocumentReviewState;
  size?: "sm" | "md";
}) {
  const t = useTranslations("regwatch.docState");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium uppercase tracking-wider ${
        size === "sm" ? "text-[9px]" : "text-[10px]"
      } ${TONE[state]}`}
    >
      {t(`state_${state}`)}
    </span>
  );
}
