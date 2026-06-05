import Link from "next/link";
import { RegwatchLogo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { NavDropdown, NavLink } from "./NavInteractive";

/**
 * RegWatch's internal app nav. Server Component — NotificationBell needs
 * to be server-renderable because its dependency chain reaches
 * supabase/server which uses next/headers. The interactive dropdowns +
 * active-link styling live in NavInteractive.tsx ("use client") so the
 * server tree stays clean.
 *
 * Compressed into grouped dropdowns:
 *   Discover ▾   (Browse, Regulators, Topics)
 *   Search                 standalone
 *   My Feed                standalone
 *   Workspace ▾  (Assets, Obligations, Documents, Footprint)
 *   Account ▾    (Account, Billing, Members, Alerts, Footprint)
 */
export function RegwatchNav({ authed }: { authed: boolean }) {
  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <RegwatchLogo href={authed ? "/regwatch/feed" : "/regwatch"} />

        <div className="hidden items-center gap-1 md:flex">
          <NavDropdown
            label="Discover"
            items={[
              { href: "/regwatch/browse", label: "Browse the corpus" },
              { href: "/regwatch/regulators", label: "Regulators" },
              { href: "/regwatch/topics", label: "Topics" },
            ]}
          />
          <NavLink href="/regwatch/search">Search</NavLink>
          {authed && <NavLink href="/regwatch/feed">My Feed</NavLink>}
          {authed && (
            <NavDropdown
              label="Workspace"
              items={[
                { href: "/regwatch/assets", label: "Assets" },
                { href: "/regwatch/obligations", label: "Obligations" },
                { href: "/regwatch/documents", label: "Internal documents" },
                { href: "/regwatch/settings/footprint", label: "Footprint" },
              ]}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden rounded-md px-3 py-1.5 text-xs text-muted hover:text-foreground sm:inline"
          >
            ← intelle.io
          </Link>
          {authed && <NotificationBell authed={authed} />}
          {authed ? (
            <NavDropdown
              label="Account"
              align="right"
              triggerClassName="flex items-center gap-1 rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-blue/60"
              items={[
                { href: "/regwatch/settings/account", label: "Account" },
                { href: "/regwatch/settings/billing", label: "Billing" },
                { href: "/regwatch/settings/members", label: "Members" },
                { href: "/regwatch/settings/alerts", label: "Alerts" },
                { href: "/regwatch/settings/footprint", label: "Footprint" },
              ]}
            />
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
