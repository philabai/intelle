"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Client-only nav primitives. Kept in a separate file so the parent Nav
 * stays a Server Component — that's important because Nav also renders
 * NotificationBell whose dependency chain reaches supabase/server, which
 * uses `next/headers` (server-only).
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

  const sectionActive = items.some(
    (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
  );

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
