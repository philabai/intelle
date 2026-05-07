"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

const ADMIN_ROLES = new Set(["admin", "content_admin", "researcher"]);

const inputStyles =
  "w-full rounded-lg border border-card-border bg-card-bg px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    let destination = next;
    if (!destination) {
      const role = (data.user?.app_metadata as { role?: string } | undefined)?.role ?? "admin";
      destination = ADMIN_ROLES.has(role) ? "/admin" : "/dashboard";
    }
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-card-bg border border-card-border">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputStyles} placeholder="you@email.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputStyles} placeholder="Password" />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><LogoMark size={48} /></div>
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="text-sm text-muted mt-1">intelle.io client area</p>
        </div>
        <Suspense fallback={<div className="h-48 rounded-xl bg-card-bg border border-card-border animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
