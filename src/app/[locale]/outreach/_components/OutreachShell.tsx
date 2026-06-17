"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LogoMark } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

// Nav grows as surfaces land. Phase 0 ships Dashboard + the 3 must-haves.
const navItems: { label: string; href: string; icon: string }[] = [
  { label: "Dashboard", href: "/outreach", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Calendar", href: "/outreach/calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Review Queue", href: "/outreach/queue", icon: "M4 6h16M4 10h16M4 14h10M4 18h10" },
  { label: "Generate", href: "/outreach/generate", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Pillars", href: "/outreach/pillars", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" },
  { label: "Seeds", href: "/outreach/seeds", icon: "M12 3v18m0 0c-3 0-6-1.5-6-5 3 0 6 1.5 6 5zm0 0c3 0 6-1.5 6-5-3 0-6 1.5-6 5zm0-7c-2.5 0-5-1.2-5-4 2.5 0 5 1.2 5 4zm0 0c2.5 0 5-1.2 5-4-2.5 0-5 1.2-5 4z" },
  { label: "Quality", href: "/outreach/quality", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Platforms", href: "/outreach/platforms", icon: "M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" },
];

export function OutreachShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-e border-card-border bg-card-bg flex flex-col shrink-0">
        <div className="p-4 border-b border-card-border">
          <Link href="/outreach" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-sm font-semibold text-white">Outreach</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/outreach" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive ? "bg-brand-blue/10 text-brand-blue" : "text-muted hover:text-white hover:bg-white/5",
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-card-border">
          <Link href="/" className="block px-3 py-2 text-sm text-muted hover:text-white transition-colors mb-1">
            View Site
          </Link>
          <button onClick={handleSignOut} className="w-full text-start px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer">
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
