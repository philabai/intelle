"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/client";

export function RegwatchSignupForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createClient();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const fullName = [trimmedFirst, trimmedLast].filter(Boolean).join(" ");
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...(trimmedFirst ? { first_name: trimmedFirst } : {}),
          ...(trimmedLast ? { last_name: trimmedLast } : {}),
          ...(fullName ? { full_name: fullName } : {}),
          ...(orgName ? { org_name: orgName } : {}),
        },
        emailRedirectTo: `${window.location.origin}/regwatch/auth/callback?next=${encodeURIComponent("/regwatch/onboarding")}`,
      },
    });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      router.push("/regwatch/onboarding");
      router.refresh();
    } else {
      setInfo(`Check ${email} to confirm your account.`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">First name</span>
          <input
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Last name</span>
          <input
            type="text"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Work email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Password</span>
        <input
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground focus:border-brand-blue focus:outline-none"
        />
        <span className="text-xs text-muted">10 characters minimum.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Organisation name (optional)</span>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Inferred from your email if blank"
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {info && <p className="text-sm text-brand-teal">{info}</p>}
    </form>
  );
}
