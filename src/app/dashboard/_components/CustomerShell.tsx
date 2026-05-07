"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";

export function CustomerShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-card-bg/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-sm font-semibold text-white">Client area</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {email && <span className="text-muted hidden sm:inline">{email}</span>}
            <Link href="/" className="text-muted hover:text-white">View site</Link>
            <button
              onClick={handleSignOut}
              className="text-red-400 hover:text-red-300 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
