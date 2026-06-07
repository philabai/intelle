import Link from "next/link";
import { RegwatchLogo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { NavDropdown, NavLink } from "./NavInteractive";
import { HelpButton } from "./help/HelpButton";

/**
 * Vantage's internal app nav. Server Component — NotificationBell needs
 * to be server-renderable because its dependency chain reaches
 * supabase/server which uses next/headers. The interactive dropdowns +
 * active-link styling live in NavInteractive.tsx ("use client") so the
 * server tree stays clean.
 *
 * Consolidated to four top-level surfaces (PR-F):
 *   Discover ▾ — public: Browse (hierarchy tree), Regulators, Topics, Search
 *   Monitor  ▾ — authed: Today, Recap, Saved, Alerts, Briefings
 *   Comply   ▾ — authed: Reviewer Inbox, Obligations, Assets, Footprint, Checkup
 *   Author   ▾ — authed: Internal documents
 *
 * Account drops the duplicate Footprint + Alerts entries; those moved to
 * Comply / Monitor respectively where they semantically belong.
 */
export function RegwatchNav({ authed }: { authed: boolean }) {
  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <RegwatchLogo
          href={authed ? "/regwatch/monitor/today" : "/regwatch/discover"}
        />

        <div className="hidden items-center gap-1 md:flex">
          <NavDropdown
            label="Discover"
            items={[
              { href: "/regwatch/discover", label: "Discover landing" },
              { href: "/regwatch/discover/browse/us", label: "Browse (hierarchy)" },
              { href: "/regwatch/regulators", label: "Regulators" },
              { href: "/regwatch/topics", label: "Topics" },
              { href: "/regwatch/search", label: "Search" },
            ]}
          />
          {authed && (
            <NavDropdown
              label="Monitor"
              items={[
                { href: "/regwatch/monitor/today", label: "Today (relevance feed)" },
                { href: "/regwatch/recap", label: "Weekly recap" },
                { href: "/regwatch/saved", label: "Saved" },
                { href: "/regwatch/settings/alerts", label: "Alerts" },
              ]}
            />
          )}
          {authed && (
            <NavDropdown
              label="Comply"
              items={[
                { href: "/regwatch/comply", label: "Comply hub" },
                { href: "/regwatch/comply/inbox", label: "Reviewer Inbox" },
                { href: "/regwatch/obligations", label: "Obligations" },
                { href: "/regwatch/assets", label: "Asset hierarchy" },
                { href: "/regwatch/settings/footprint", label: "Footprint" },
              ]}
            />
          )}
          {authed && (
            <NavDropdown
              label="Author"
              items={[
                { href: "/regwatch/documents", label: "Internal documents" },
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
          <HelpButton />
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
