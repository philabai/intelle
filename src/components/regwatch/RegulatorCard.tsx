import Link from "next/link";
import type { RegulatorSummary } from "@/lib/regwatch/queries";

const REGION_LABEL: Record<string, string> = {
  na: "North America",
  eu: "European Union",
  uk: "United Kingdom",
  mea: "Middle East & Africa",
  asia: "Asia & Pacific",
  lac: "Latin America & Caribbean",
  int: "International",
};

const TYPE_LABEL: Record<string, string> = {
  "federal-agency": "Federal agency",
  commission: "Commission",
  authority: "Authority",
  "standards-body": "Standards body",
  "international-body": "International body",
};

export function RegulatorCard({ regulator }: { regulator: RegulatorSummary }) {
  return (
    <Link
      href={`/regwatch/regulator/${regulator.slug}`}
      className="group block rounded-xl border border-card-border bg-card-bg p-5 transition-all hover:border-brand-teal/60 hover:shadow-lg hover:shadow-brand-teal/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {REGION_LABEL[regulator.region] ?? regulator.region}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground">
            {regulator.short_name ?? regulator.name}
          </h3>
          {regulator.short_name && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">
              {regulator.name}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-brand-navy/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          {regulator.jurisdiction_code}
        </span>
      </div>

      {regulator.description && (
        <p className="mt-3 line-clamp-3 text-xs text-muted">
          {regulator.description}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-muted">Type</dt>
          <dd className="mt-0.5 truncate text-foreground">
            {TYPE_LABEL[regulator.regulator_type] ?? regulator.regulator_type}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Items</dt>
          <dd className="mt-0.5 text-base font-semibold text-foreground">
            {regulator.item_count}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Last 30d</dt>
          <dd className="mt-0.5 text-base font-semibold text-brand-teal">
            {regulator.recent_item_count}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted group-hover:text-foreground">
        Open profile →
      </p>
    </Link>
  );
}
