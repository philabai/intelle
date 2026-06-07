import Link from "next/link";

export function RegwatchLogo({ href = "/regwatch" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
      aria-label="Vantage by intelle.io"
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full bg-brand-teal"
      />
      <span>
        <span className="text-brand-teal">Vantage</span>
        <span className="ml-1 text-muted">by intelle.io</span>
      </span>
    </Link>
  );
}
