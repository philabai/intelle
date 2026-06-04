import Link from "next/link";
import { RegwatchLogo } from "./Logo";

/**
 * RegWatch's internal app nav — distinct from the main intelle.io SiteNav
 * which renders on marketing pages. Four global affordances per A.3 IA:
 * Browse / Search / Feed / Saved + account menu. Notification bell and Iris
 * launcher land in Phase 1.
 */
export function RegwatchNav({ authed }: { authed: boolean }) {
  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <RegwatchLogo href={authed ? "/regwatch/feed" : "/regwatch"} />
        <div className="hidden items-center gap-1 md:flex">
          <RegwatchNavLink href="/regwatch/browse">Browse</RegwatchNavLink>
          <RegwatchNavLink href="/regwatch/search">Search</RegwatchNavLink>
          {authed && <RegwatchNavLink href="/regwatch/feed">My Feed</RegwatchNavLink>}
          {authed && <RegwatchNavLink href="/regwatch/saved">Saved</RegwatchNavLink>}
          {authed && (
            <RegwatchNavLink href="/regwatch/settings/footprint">
              Footprint
            </RegwatchNavLink>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden rounded-md px-3 py-1.5 text-xs text-muted hover:text-foreground sm:inline"
          >
            ← intelle.io
          </Link>
          {authed ? (
            <Link
              href="/regwatch/settings/account"
              className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-blue/60"
            >
              Account
            </Link>
          ) : (
            <>
              <Link
                href="/regwatch/login"
                className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/regwatch/signup"
                className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function RegwatchNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-card-bg hover:text-foreground"
    >
      {children}
    </Link>
  );
}
