"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Client-only nav primitives. Kept in a separate file so the parent Nav
 * stays a Server Component — that's important because Nav also renders
 * NotificationBell whose dependency chain reaches supabase/server, which
 * uses `next/headers` (server-only).
 *
 * Dropdown open behaviour:
 *   - Desktop (>=md): opens on HOVER (pointer over the trigger or panel
 *     keeps it open). Also opens on click for keyboard / touch users
 *     and stays sticky for 200ms after pointer leaves to allow diagonal
 *     mouse paths to the menu items.
 *   - Mobile (<md): the parent Nav renders a hamburger sheet (see
 *     MobileNavSheet below). NavDropdown isn't rendered on mobile.
 */

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionActive = items.some(
    (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
  );

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

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
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
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
        <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-card-border bg-background/95 backdrop-blur-md md:hidden">
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
            const active =
              pathname === it.href || pathname.startsWith(it.href + "/");
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
