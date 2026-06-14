import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { RegulationListItem } from "@/lib/regwatch/queries";
import { StatusChip } from "./StatusChip";
import { InstrumentTypeBadge } from "./InstrumentTypeBadge";

export async function RegulationRow({ item }: { item: RegulationListItem }) {
  const t = await getTranslations("regwatch.discover");
  const format = await getFormatter();
  const href = `/regwatch/r/${item.jurisdiction_code.toLowerCase()}/${item.slug}`;
  const changedAgo = format.relativeTime(new Date(item.last_changed_at));

  return (
    <Link
      href={href}
      className="group block border-b border-card-border bg-transparent px-4 py-4 transition-colors hover:bg-card-bg/60 sm:px-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="rounded-md bg-brand-navy/60 px-1.5 py-0.5 font-medium uppercase tracking-wider">
              {item.jurisdiction_code}
            </span>
            <span className="font-medium text-foreground/80">
              {item.regulator.short_name ?? item.regulator.name}
            </span>
            <span aria-hidden>·</span>
            <span className="font-mono">{item.citation}</span>
            <InstrumentTypeBadge value={item.instrument_type} />
            <StatusChip status={item.status} />
          </div>
          <h3 className="mt-2 text-sm font-medium text-foreground group-hover:text-brand-teal">
            {item.title}
          </h3>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-xs text-muted">{item.summary}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-end text-[11px] text-muted">
          <span>{changedAgo}</span>
          {item.effective_date && (
            <span>
              {t("effAbbr")}{" "}
              <time dateTime={item.effective_date}>
                {format.dateTime(new Date(item.effective_date), {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
