import Link from "next/link";
import type { JurisdictionSummary } from "@/lib/regwatch/queries";

const REGION_LABEL: Record<string, string> = {
  na: "North America",
  eu: "European Union",
  uk: "United Kingdom",
  mea: "Middle East & Africa",
  asia: "Asia",
  lac: "Latin America",
  int: "International",
};

export function JurisdictionTile({ summary }: { summary: JurisdictionSummary }) {
  return (
    <Link
      href={`/regwatch/browse/${summary.jurisdiction_code.toLowerCase()}`}
      className="group block rounded-xl border border-card-border bg-card-bg p-5 transition-all hover:border-brand-teal/60 hover:shadow-lg hover:shadow-brand-teal/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {REGION_LABEL[summary.region] ?? summary.region}
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
          <dt className="text-muted">Regulators</dt>
          <dd className="mt-0.5 text-base font-semibold text-foreground">
            {summary.regulator_count}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Items</dt>
          <dd className="mt-0.5 text-base font-semibold text-foreground">
            {summary.item_count}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Last 30d</dt>
          <dd className="mt-0.5 text-base font-semibold text-brand-teal">
            {summary.recent_item_count}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted group-hover:text-foreground">
        Browse {summary.jurisdiction_name} →
      </p>
    </Link>
  );
}
