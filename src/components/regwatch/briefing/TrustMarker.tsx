import { useTranslations } from "next-intl";

interface Props {
  counts: { green: number; amber: number; red: number };
}

/**
 * Lexis+ Shepard's Verify pattern — display the post-generation citation
 * validation state. v1 marks every citation green because the only sources we
 * feed the model are first-party corpus rows. Phase 1.x adds adversarial
 * verification that may yield amber/red.
 */
export function TrustMarker({ counts }: Props) {
  const t = useTranslations("regwatch.chips");
  const total = counts.green + counts.amber + counts.red;
  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-card-border bg-card-bg px-2 py-0.5 text-[11px] text-muted">
        {t("noCitations")}
      </span>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card-bg px-2 py-1 text-[11px]">
      <span title={t("verifiedAgainstCorpus")} className="inline-flex items-center gap-1 text-brand-teal">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-brand-teal" />
        {counts.green}
      </span>
      {counts.amber > 0 && (
        <span title={t("partialMatch")} className="inline-flex items-center gap-1 text-amber-300">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-300" />
          {counts.amber}
        </span>
      )}
      {counts.red > 0 && (
        <span title={t("unverified")} className="inline-flex items-center gap-1 text-red-300">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-red-300" />
          {counts.red}
        </span>
      )}
    </div>
  );
}
