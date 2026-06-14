import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Props {
  hasFootprint: boolean;
}

/**
 * Three distinct empty states per A.3:
 *  1. No footprint configured → onboarding prompt
 *  2. Footprint configured but matcher hasn't run yet → wait + manual trigger
 *  3. Footprint configured + matcher ran but no items cleared the threshold
 *     → broaden the footprint
 */
export function EmptyFeed({ hasFootprint }: Props) {
  const t = useTranslations("regwatch.monitor");
  if (!hasFootprint) {
    return (
      <div className="rounded-xl border border-dashed border-card-border bg-card-bg/40 p-8 text-center">
        <h2 className="text-lg font-medium text-foreground">
          {t("emptyNoFootprintTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {t("emptyNoFootprintBody")}
        </p>
        <Link
          href="/regwatch/settings/footprint"
          className="mt-5 inline-block rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
        >
          {t("configureFootprintCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-card-border bg-card-bg/40 p-8 text-center">
      <h2 className="text-lg font-medium text-foreground">
        {t("emptyCaughtUpTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {t("emptyCaughtUpBody")}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link
          href="/regwatch/settings/footprint"
          className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
        >
          {t("editFootprint")}
        </Link>
        <Link
          href="/regwatch/browse"
          className="rounded-md border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground hover:border-brand-teal"
        >
          {t("browseCorpus")}
        </Link>
      </div>
    </div>
  );
}
