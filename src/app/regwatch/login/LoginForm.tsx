"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/client";

export function RegwatchLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/regwatch/feed";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createClient();
    if (mode === "password") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/regwatch/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      setPending(false);
      if (err) {
        setError(err.message);
        return;
      }
      setInfo(`Check ${email} for a sign-in link.`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
        />
      </label>
      {mode === "password" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Working…" : mode === "password" ? "Sign in" : "Email me a link"}
      </button>
      <button
        type="button"
        className="self-start text-xs text-muted underline hover:text-foreground"
        onClick={() => {
          setMode((m) => (m === "password" ? "magic" : "password"));
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {info && <p className="text-sm text-brand-teal">{info}</p>}
    </form>
  );
}
