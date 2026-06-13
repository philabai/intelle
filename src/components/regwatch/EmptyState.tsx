import { Link } from "@/i18n/navigation";

interface Props {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({ title, description, ctaLabel, ctaHref }: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-card-border bg-card-bg/40 p-6 text-sm">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && <p className="text-muted">{description}</p>}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-teal"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
