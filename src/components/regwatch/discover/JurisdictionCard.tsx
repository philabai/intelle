import { Link } from "@/i18n/navigation";

interface Props {
  jurisdictionCode: string;
  jurisdictionName: string;
  publisherCount: number;
  itemCount: number;
  recentCount: number;
  accentColor?: string;
  featured?: boolean;
}

/**
 * Discover landing jurisdiction card. Each card surfaces total items,
 * publisher count, and recent-update count so visitors can pick where
 * to drill in without already knowing the publisher's name.
 *
 * The featured prop is used by jurisdictions we want to spotlight
 * (initially Saudi Arabia once SASO ships in PR-E) — it bumps the
 * card's prominence with a brand-coloured rule and accent.
 */
export function JurisdictionCard({
  jurisdictionCode,
  jurisdictionName,
  publisherCount,
  itemCount,
  recentCount,
  accentColor,
  featured,
}: Props) {
  return (
    <Link
      href={`/regwatch/browse/${jurisdictionCode.toLowerCase()}`}
      className={`group block overflow-hidden rounded-xl border bg-card-bg/40 p-5 transition hover:border-brand-blue/60 hover:bg-card-bg/60 ${featured ? "border-brand-teal/50 shadow-lg shadow-brand-teal/10" : "border-card-border"}`}
      style={
        featured && accentColor
          ? { borderTopWidth: 3, borderTopColor: accentColor }
          : undefined
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {jurisdictionCode}
        </p>
        {recentCount > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            {recentCount} updated 30d
          </span>
        )}
      </div>
      <h3 className="mt-1 text-lg font-semibold text-foreground group-hover:text-brand-teal">
        {jurisdictionName}
      </h3>
      <p className="mt-2 text-xs text-muted">
        {publisherCount} {publisherCount === 1 ? "publisher" : "publishers"} ·{" "}
        {itemCount.toLocaleString()}{" "}
        {itemCount === 1 ? "regulation" : "regulations"}
      </p>
      <p className="mt-3 text-[11px] text-brand-blue opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        Browse the hierarchy →
      </p>
    </Link>
  );
}
