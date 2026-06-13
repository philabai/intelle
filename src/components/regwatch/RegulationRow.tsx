import { Link } from "@/i18n/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import type { RegulationListItem } from "@/lib/regwatch/queries";
import { StatusChip } from "./StatusChip";
import { InstrumentTypeBadge } from "./InstrumentTypeBadge";

export function RegulationRow({ item }: { item: RegulationListItem }) {
  const href = `/regwatch/r/${item.jurisdiction_code.toLowerCase()}/${item.slug}`;
  const changedAgo = formatDistanceToNowStrict(new Date(item.last_changed_at), {
    addSuffix: false,
  });

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
        <div className="flex shrink-0 flex-col items-end gap-2 text-right text-[11px] text-muted">
          <span>{changedAgo} ago</span>
          {item.effective_date && (
            <span>
              eff.{" "}
              <time dateTime={item.effective_date}>
                {new Date(item.effective_date).toLocaleDateString("en-GB", {
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
