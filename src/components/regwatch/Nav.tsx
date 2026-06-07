import Link from "next/link";
import { RegwatchLogo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import {
  NavDropdown,
  MobileNavSheet,
  type NavCluster,
  type DropdownItem,
} from "./NavInteractive";
import { HelpButton } from "./help/HelpButton";

/**
 * Vantage's internal app nav. Server Component — NotificationBell needs
 * to be server-renderable because its dependency chain reaches
 * supabase/server which uses `next/headers` (server-only).
 *
 * Four top-level surfaces (PR-F), with hover-open dropdowns on
 * desktop and a hamburger sheet on mobile (PR-F follow-up):
 *
 *   Discover ▾ — public  · landing + browse hierarchy + regulators + topics + search
 *   Monitor  ▾ — authed  · today + recap + saved + alerts
 *   Comply   ▾ — authed  · inbox + obligations + assets + footprint
 *   Author   ▾ — authed  · internal documents
 *   Account  ▾ — authed  · account + billing + members
 *
 * The cluster list is defined ONCE here and passed to both the desktop
 * NavDropdown row and the mobile MobileNavSheet — no duplication.
 */

const DISCOVER_ITEMS: DropdownItem[] = [
  { href: "/regwatch/discover", label: "Discover landing" },
  { href: "/regwatch/discover/browse/us", label: "Browse (hierarchy)" },
  { href: "/regwatch/regulators", label: "Regulators" },
  { href: "/regwatch/topics", label: "Topics" },
  { href: "/regwatch/search", label: "Search" },
];
const MONITOR_ITEMS: DropdownItem[] = [
  { href: "/regwatch/monitor/today", label: "Today (relevance feed)" },
  { href: "/regwatch/recap", label: "Weekly recap" },
  { href: "/regwatch/saved", label: "Saved" },
  { href: "/regwatch/settings/alerts", label: "Alerts" },
];
const COMPLY_ITEMS: DropdownItem[] = [
  { href: "/regwatch/comply", label: "Comply hub" },
  { href: "/regwatch/comply/inbox", label: "Reviewer Inbox" },
  { href: "/regwatch/obligations", label: "Obligations" },
  { href: "/regwatch/assets", label: "Asset hierarchy" },
  { href: "/regwatch/settings/footprint", label: "Footprint" },
];
const AUTHOR_ITEMS: DropdownItem[] = [
  { href: "/regwatch/documents", label: "Internal documents" },
];
const ACCOUNT_ITEMS: DropdownItem[] = [
  { href: "/regwatch/settings/account", label: "Account" },
  { href: "/regwatch/settings/billing", label: "Billing" },
  { href: "/regwatch/settings/members", label: "Members" },
];

const CLUSTERS: NavCluster[] = [
  { label: "Discover", items: DISCOVER_ITEMS },
  { label: "Monitor", items: MONITOR_ITEMS, authedOnly: true },
  { label: "Comply", items: COMPLY_ITEMS, authedOnly: true },
  { label: "Author", items: AUTHOR_ITEMS, authedOnly: true },
];

export function RegwatchNav({ authed }: { authed: boolean }) {
  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <RegwatchLogo
            href={authed ? "/regwatch/monitor/today" : "/regwatch/discover"}
          />
        </div>

        {/* Desktop nav — hidden below md, replaced by the hamburger sheet. */}
        <div className="hidden items-center gap-1 md:flex">
          {CLUSTERS.filter((c) => !c.authedOnly || authed).map((c) => (
            <NavDropdown key={c.label} label={c.label} items={c.items} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-md px-2 py-1.5 text-xs text-muted hover:text-foreground lg:inline"
          >
            ← intelle.io
          </Link>
          <HelpButton />
          {authed && <NotificationBell authed={authed} />}
          {authed ? (
            <div className="hidden md:inline-flex">
              <NavDropdown
                label="Account"
                align="right"
                triggerClassName="flex items-center gap-1 rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-blue/60"
                items={ACCOUNT_ITEMS}
              />
            </div>
          ) : (
            <>
              <Link
                href="/regwatch/login"
                className="hidden rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground sm:inline"
              >
                Sign in
              </Link>
              <Link
                href="/regwatch/signup"
                className="hidden rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 sm:inline"
              >
                Get started
              </Link>
            </>
          )}

          {/* Mobile hamburger — only visible <md */}
          <MobileNavSheet
            clusters={CLUSTERS}
            authed={authed}
            accountItems={ACCOUNT_ITEMS}
          />
        </div>
      </div>
    </nav>
  );
}
