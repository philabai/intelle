import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { JurisdictionSummary } from "@/lib/regwatch/queries";

const KNOWN_REGIONS = new Set(["na", "eu", "uk", "mea", "asia", "lac", "int"]);

export function JurisdictionTile({ summary }: { summary: JurisdictionSummary }) {
  const t = useTranslations("regwatch.discover");
  const regionLabel = KNOWN_REGIONS.has(summary.region)
    ? t(`regionShort.${summary.region}`)
    : summary.region;
  return (
    <Link
      href={`/regwatch/browse/${summary.jurisdiction_code.toLowerCase()}`}
      className="group block rounded-xl border border-card-border bg-card-bg p-5 transition-all hover:border-brand-teal/60 hover:shadow-lg hover:shadow-brand-teal/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {regionLabel}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {summary.jurisdiction_name}
          </h3>
        </div>
        <span className="rounded-full bg-brand-navy/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          {summary.jurisdiction_code}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-muted">{t("statRegulators")}</dt>
          <dd className="mt-0.5 text-base font-semibold text-foreground">
            {summary.regulator_count}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("statItems")}</dt>
          <dd className="mt-0.5 text-base font-semibold text-foreground">
            {summary.item_count}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("statLast30d")}</dt>
          <dd className="mt-0.5 text-base font-semibold text-brand-teal">
            {summary.recent_item_count}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted group-hover:text-foreground">
        {t("browseJurisdiction", { name: summary.jurisdiction_name })}
      </p>
    </Link>
  );
}
