import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

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

// Structure with message keys (into the `regwatch.nav` namespace); labels are
// resolved per-locale in the server component before being passed to the client
// nav components.
type ItemKey = { href: string; key: string };
type ClusterKey = { key: string; items: ItemKey[]; authedOnly?: boolean };

const NAV_STRUCTURE: ClusterKey[] = [
  {
    key: "regulations",
    items: [
      { href: "/regwatch/discover", key: "country" },
      { href: "/regwatch/regulators", key: "regulators" },
      { href: "/regwatch/topics", key: "topics" },
      { href: "/regwatch/search", key: "search" },
    ],
  },
  {
    key: "monitor",
    authedOnly: true,
    items: [
      { href: "/regwatch/monitor/today", key: "today" },
      { href: "/regwatch/recap", key: "weeklyRecap" },
      { href: "/regwatch/saved", key: "saved" },
      { href: "/regwatch/settings/alerts", key: "alerts" },
    ],
  },
  {
    key: "comply",
    authedOnly: true,
    items: [
      { href: "/regwatch/comply", key: "complyHub" },
      { href: "/regwatch/comply/inbox", key: "reviewerInbox" },
      { href: "/regwatch/obligations", key: "obligations" },
      { href: "/regwatch/assets", key: "assetHierarchy" },
      { href: "/regwatch/settings/footprint", key: "footprint" },
    ],
  },
  {
    key: "author",
    authedOnly: true,
    items: [{ href: "/regwatch/documents", key: "companyDocuments" }],
  },
];
const ACCOUNT_STRUCTURE: ItemKey[] = [
  { href: "/regwatch/settings/account", key: "profile" },
  { href: "/regwatch/settings/billing", key: "billing" },
  { href: "/regwatch/settings/members", key: "members" },
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

export async function RegwatchNav({ authed }: { authed: boolean }) {
  const tn = await getTranslations("regwatch.nav");
  const CLUSTERS: NavCluster[] = NAV_STRUCTURE.map((c) => ({
    label: tn(c.key),
    authedOnly: c.authedOnly,
    items: c.items.map((i) => ({ href: i.href, label: tn(i.key) })),
  }));
  const ACCOUNT_ITEMS: DropdownItem[] = ACCOUNT_STRUCTURE.map((i) => ({
    href: i.href,
    label: tn(i.key),
  }));

  let accountLabel = tn("account");
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
          {authed && (
            <Link
              href="/regwatch/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-card-bg/60"
            >
              {tn("dashboard")}
            </Link>
          )}
          {CLUSTERS.filter((c) => !c.authedOnly || authed).map((c) => (
            <NavDropdown key={c.label} label={c.label} items={c.items} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-md px-2 py-1.5 text-xs text-muted hover:text-foreground lg:inline"
          >
            ← {tn("backToIntelle")}
          </Link>
          <LocaleSwitcher className="hidden sm:inline-flex" />
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
                {tn("signIn")}
              </Link>
              <Link
                href="/regwatch/signup"
                className="hidden rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue/90 sm:inline"
              >
                {tn("getStarted")}
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
