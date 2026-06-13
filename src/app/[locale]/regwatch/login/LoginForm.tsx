"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/regwatch/supabase/client";

export function RegwatchLoginForm() {
  const t = useTranslations("regwatch.auth");
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/regwatch/dashboard";

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
      setInfo(t("checkEmailLink", { email }));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">{t("email")}</span>
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
          <span className="text-muted">{t("password")}</span>
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
        {pending ? t("working") : mode === "password" ? t("signInBtn") : t("emailMeLink")}
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
        {mode === "password" ? t("useMagicLink") : t("usePassword")}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {info && <p className="text-sm text-brand-teal">{info}</p>}
    </form>
  );
}
