import { Link } from "@/i18n/navigation";

/** Card shell with a title, optional "View →" link, and a body. */
export function Card({
  title,
  href,
  badge,
  accent,
  className,
  children,
}: {
  title: string;
  href?: string;
  badge?: React.ReactNode;
  accent?: "teal" | "violet" | "amber" | "blue";
  className?: string;
  children: React.ReactNode;
}) {
  const bar =
    accent === "teal"
      ? "before:bg-brand-teal"
      : accent === "violet"
        ? "before:bg-brand-violet"
        : accent === "amber"
          ? "before:bg-amber-400"
          : "before:bg-brand-blue";
  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-xl border border-card-border bg-card-bg/40 p-4 before:absolute before:inset-y-0 before:start-0 before:w-0.5 ${bar} ${className ?? ""}`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {title}
          {badge}
        </h3>
        {href && (
          <Link href={href} className="shrink-0 text-[11px] text-brand-teal hover:underline">
            View →
          </Link>
        )}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/** A big metric with a caption. */
export function Stat({
  value,
  label,
  tone,
  href,
}: {
  value: number | string;
  label: string;
  tone?: "default" | "danger" | "warn" | "good";
  href?: string;
}) {
  const color =
    tone === "danger"
      ? "text-red-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "good"
          ? "text-brand-teal"
          : "text-foreground";
  const inner = (
    <>
      <span className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</span>
      <span className="mt-0.5 block text-[11px] leading-tight text-muted">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg px-1 py-0.5 hover:bg-card-bg/60">
      {inner}
    </Link>
  ) : (
    <div className="px-1">{inner}</div>
  );
}

/** A compact tappable list row inside a card. */
export function RowLink({
  href,
  title,
  meta,
  pill,
  pillTone,
}: {
  href: string;
  title: string;
  meta?: string;
  pill?: string;
  pillTone?: "danger" | "warn" | "good" | "muted";
}) {
  const tone =
    pillTone === "danger"
      ? "bg-red-500/15 text-red-300"
      : pillTone === "warn"
        ? "bg-amber-500/15 text-amber-300"
        : pillTone === "good"
          ? "bg-brand-teal/15 text-brand-teal"
          : "bg-card-bg text-muted";
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-card-bg/60"
    >
      <span className="min-w-0 flex-1 truncate text-foreground">{title}</span>
      {meta && <span className="shrink-0 text-[10px] text-muted">{meta}</span>}
      {pill && (
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${tone}`}
        >
          {pill}
        </span>
      )}
    </Link>
  );
}

/** Guided setup / upsell state shown when a card has no data or is gated. */
export function SetupState({
  text,
  ctaLabel,
  ctaHref,
  locked,
}: {
  text: string;
  ctaLabel: string;
  ctaHref: string;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2 py-2">
      <p className="text-xs text-muted">{text}</p>
      <Link
        href={ctaHref}
        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
          locked
            ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
            : "bg-brand-blue text-white hover:bg-brand-blue/90"
        }`}
      >
        {locked ? `🔒 ${ctaLabel}` : ctaLabel}
      </Link>
    </div>
  );
}

/** Horizontal stacked proportion bar (e.g., obligation status mix). */
export function StackedBar({
  segments,
}: {
  segments: { value: number; className: string; label: string }[];
}) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-card-bg">
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div
            key={i}
            className={s.className}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ) : null,
      )}
    </div>
  );
}
