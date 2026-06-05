"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RegwatchLogo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

/**
 * RegWatch's internal app nav. Compressed into two grouped dropdowns:
 *
 *   Discover ▾  (Browse, Regulators, Topics)   — corpus exploration
 *   Search                                      — the workhorse, kept flat
 *   My Feed                                     — personal activity
 *   Workspace ▾ (Assets, Obligations, Documents, Footprint) — org-private
 *   Account ▾ (Account, Billing, Members, Alerts, Footprint)
 *
 * The dropdown root highlights when the current route is under it, so
 * users can still see where they are at a glance.
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
              items={[
                { href: "/regwatch/settings/account", label: "Account" },
                { href: "/regwatch/settings/billing", label: "Billing" },
                { href: "/regwatch/settings/members", label: "Members" },
                { href: "/regwatch/settings/alerts", label: "Alerts" },
                { href: "/regwatch/settings/footprint", label: "Footprint" },
              ]}
              triggerClassName="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-blue/60"
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

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? "bg-card-bg text-foreground"
          : "text-muted hover:bg-card-bg hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

interface DropdownItem {
  href: string;
  label: string;
}

function NavDropdown({
  label,
  items,
  align = "left",
  triggerClassName,
}: {
  label: string;
  items: DropdownItem[];
  align?: "left" | "right";
  triggerClassName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const activeIdx = items.findIndex(
    (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
  );
  const sectionActive = activeIdx !== -1;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("click", onClickOutside);
      window.addEventListener("keydown", onKey);
    }
    return () => {
      window.removeEventListener("click", onClickOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          triggerClassName ??
          `flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition ${
            sectionActive
              ? "bg-card-bg text-foreground"
              : "text-muted hover:bg-card-bg hover:text-foreground"
          }`
        }
      >
        <span>{label}</span>
        <span
          aria-hidden
          className={`text-[10px] text-muted transition ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-1 w-56 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <ul className="py-1">
            {items.map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    role="menuitem"
                    className={`block px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-brand-teal/10 text-brand-teal"
                        : "text-foreground hover:bg-brand-navy/40"
                    }`}
                  >
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
