import Link from "next/link";

export function RegwatchLogo({ href = "/regwatch" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full bg-brand-teal"
      />
      <span>
        intelle.io
        <span className="ml-1 text-brand-teal">RegWatch</span>
      </span>
    </Link>
  );
}
