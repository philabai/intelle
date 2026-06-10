"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Client-only nav primitives. Kept in a separate file so the parent Nav
 * stays a Server Component — that's important because Nav also renders
 * NotificationBell whose dependency chain reaches supabase/server, which
 * uses `next/headers` (server-only).
 *
 * Dropdown open behaviour:
 *   - Desktop (>=md): opens on HOVER (pointer over the trigger or panel
 *     keeps it open). Also opens on click for keyboard / touch users
 *     and stays sticky for ~220ms after pointer leaves to allow diagonal
 *     mouse paths to the menu items.
 *   - When one dropdown opens, it broadcasts a window event so any other
 *     open dropdown closes IMMEDIATELY (no two-open-at-once overlap when
 *     sliding from one top menu to another).
 *   - Active-row highlight inside a dropdown is EXACT-match on the
 *     pathname — parent hubs (e.g. `/regwatch/comply`) don't co-light
 *     with their children (e.g. `/regwatch/comply/inbox`). Only the
 *     trigger button uses prefix-match for the "section is active"
 *     visual.
 *   - Mobile (<md): the parent Nav renders a hamburger sheet (see
 *     MobileNavSheet below). NavDropdown isn't rendered on mobile.
 */

const NAV_OPEN_EVENT = "vantage:navdropdown-open";

export function NavLink({
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

export interface DropdownItem {
  href: string;
  label: string;
}

export function NavDropdown({
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
  const ownId = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger lights up when ANY child route is the current page — uses
  // prefix-match so /regwatch/comply trigger highlights on
  // /regwatch/comply/inbox. Individual menu rows use exact-match below.
  const sectionActive = items.some(
    (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
  );

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function openMe() {
    cancelClose();
    setOpen(true);
    // Tell every other NavDropdown to close right now — prevents two
    // menus overlapping when the user slides between top items.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<string>(NAV_OPEN_EVENT, { detail: ownId }),
      );
    }
  }

  // Listen for siblings opening; close myself instantly when they do.
  useEffect(() => {
    function onSiblingOpen(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === ownId) return;
      cancelClose();
      setOpen(false);
    }
    window.addEventListener(NAV_OPEN_EVENT, onSiblingOpen);
    return () => window.removeEventListener(NAV_OPEN_EVENT, onSiblingOpen);
  }, [ownId]);

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={openMe}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => {
          if (open) setOpen(false);
          else openMe();
        }}
        onFocus={openMe}
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
          className={`absolute top-full z-50 mt-1 w-56 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <ul className="py-1">
            {items.map((it) => {
              // EXACT match only — parent hub rows (/regwatch/comply)
              // don't stay highlighted when a child (/regwatch/comply/inbox)
              // is the active page.
              const active = pathname === it.href;
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

/**
 * Mobile nav sheet — hamburger trigger + full-screen slide-down panel
 * with every nav cluster as an accordion. Rendered on screens narrower
 * than `md`; the desktop dropdowns hide via md:flex on the parent.
 *
 * The Nav passes the same cluster array shape so the mobile sheet
 * stays in sync without redefining nav items in two places.
 */
export interface NavCluster {
  label: string;
  items: DropdownItem[];
  authedOnly?: boolean;
}

export function MobileNavSheet({
  clusters,
  authed,
  accountItems,
}: {
  clusters: NavCluster[];
  authed: boolean;
  accountItems: DropdownItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const visibleClusters = clusters.filter((c) => !c.authedOnly || authed);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-card-border bg-card-bg text-muted hover:border-brand-blue hover:text-foreground md:hidden"
      >
        {open ? (
          <span aria-hidden className="text-base">✕</span>
        ) : (
          <span aria-hidden className="text-base">☰</span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-card-border bg-background/95 backdrop-blur-md md:hidden">
          <div className="space-y-3 px-4 py-4">
            {visibleClusters.map((c) => (
              <MobileCluster key={c.label} cluster={c} />
            ))}
            {authed && (
              <MobileCluster
                cluster={{ label: "Account", items: accountItems }}
                defaultOpen={false}
              />
            )}
            {!authed && (
              <div className="flex gap-2 pt-2">
                <Link
                  href="/regwatch/login"
                  className="flex-1 rounded-md border border-card-border bg-card-bg px-3 py-2 text-center text-sm text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/regwatch/signup"
                  className="flex-1 rounded-md bg-brand-blue px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Get started
                </Link>
              </div>
            )}
            <Link
              href="/"
              className="block px-2 py-2 text-xs text-muted hover:text-foreground"
            >
              ← intelle.io
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function MobileCluster({
  cluster,
  defaultOpen = true,
}: {
  cluster: { label: string; items: DropdownItem[] };
  defaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-card-border bg-card-bg/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-foreground"
      >
        <span>{cluster.label}</span>
        <span aria-hidden className="text-xs text-muted">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <ul className="border-t border-card-border">
          {cluster.items.map((it) => {
            // Exact-match parity with the desktop dropdown — prevents a
            // parent hub row staying highlighted alongside its child.
            const active = pathname === it.href;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={`block px-4 py-2 text-sm transition ${
                    active
                      ? "bg-brand-teal/10 text-brand-teal"
                      : "text-foreground/90 hover:bg-brand-navy/40"
                  }`}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
