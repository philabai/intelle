import Link from "next/link";
import { createClient } from "@/lib/regwatch/supabase/server";
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
 *   Regulations ▾ — public · country landing + regulators + topics + search
 *   Monitor     ▾ — authed · today + recap + saved + alerts
 *   Comply      ▾ — authed · inbox + obligations + assets + footprint
 *   Author      ▾ — authed · company documents
 *   Account     ▾ — authed · profile + billing + members
 *
 * The cluster list is defined ONCE here and passed to both the desktop
 * NavDropdown row and the mobile MobileNavSheet — no duplication.
 */

const REGULATIONS_ITEMS: DropdownItem[] = [
  { href: "/regwatch/discover", label: "Country" },
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
  { href: "/regwatch/documents", label: "Company documents" },
];
const ACCOUNT_ITEMS: DropdownItem[] = [
  { href: "/regwatch/settings/account", label: "Profile" },
  { href: "/regwatch/settings/billing", label: "Billing" },
  { href: "/regwatch/settings/members", label: "Members" },
];

/**
 * Best-effort first name for the Account menu trigger. Prefers an
 * explicit first_name in user_metadata (captured at signup), falls
 * back to the leading token of full_name, then the email local-part.
 */
function firstNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): string {
  if (!user) return "Account";
  const meta = user.user_metadata ?? {};
  const first = (meta.first_name as string | undefined)?.trim();
  if (first) return first;
  const full = (meta.full_name as string | undefined)?.trim();
  if (full) return full.split(/\s+/)[0];
  const email = user.email ?? "";
  const local = email.split("@")[0];
  if (local) {
    // Capitalise the local-part token (john.doe → John).
    const token = local.split(/[._-]/)[0];
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  return "Account";
}

const CLUSTERS: NavCluster[] = [
  { label: "Regulations", items: REGULATIONS_ITEMS },
  { label: "Monitor", items: MONITOR_ITEMS, authedOnly: true },
  { label: "Comply", items: COMPLY_ITEMS, authedOnly: true },
  { label: "Author", items: AUTHOR_ITEMS, authedOnly: true },
];

export async function RegwatchNav({ authed }: { authed: boolean }) {
  let accountLabel = "Account";
  if (authed) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    accountLabel = firstNameFromUser(user);
  }

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <RegwatchLogo
            href={authed ? "/regwatch/dashboard" : "/regwatch/discover"}
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
                label={accountLabel}
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
