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
