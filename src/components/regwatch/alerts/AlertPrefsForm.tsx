"use client";

import { useState, useTransition } from "react";
import { saveAlertPrefs, sendTestDigestNow } from "@/lib/regwatch/alerts-actions";
import type { UserAlertPrefs } from "@/lib/regwatch/alerts";

interface Props {
  initial: UserAlertPrefs;
}

export function AlertPrefsForm({ initial }: Props) {
  const [emailFrequency, setEmailFrequency] = useState(initial.emailFrequency);
  const [emailCriticalOnly, setEmailCriticalOnly] = useState(initial.emailCriticalOnly);
  const [webPushEnabled, setWebPushEnabled] = useState(initial.webPushEnabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [testPending, setTestPending] = useState(false);
  const [testResult, setTestResult] = useState<
    | { kind: "ok"; text: string }
    | { kind: "error"; text: string }
    | { kind: "empty"; text: string }
    | null
  >(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await saveAlertPrefs({
        emailFrequency,
        emailCriticalOnly,
        webPushEnabled,
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: res.error ?? "Could not save" });
        return;
      }
      setMessage({ kind: "ok", text: "Saved." });
    });
  }

  async function onSendTest() {
    if (testPending) return;
    setTestResult(null);
    setTestPending(true);
    try {
      const res = await sendTestDigestNow({ mode: "daily" });
      if (!res.ok) {
        setTestResult({
          kind: "error",
          text: res.error ?? "Send failed",
        });
      } else if (!res.sent) {
        setTestResult({
          kind: "empty",
          text: `No matches eligible right now. (pulled ${res.diagnostics.pulled}, critical-only left ${res.diagnostics.afterCriticalGate}, after dedup ${res.diagnostics.afterDedup}.) The Preview button skips both filters and shows the layout regardless.`,
        });
      } else {
        setTestResult({
          kind: "ok",
          text: `Sent — check your inbox for ${res.matchCount} ${res.matchCount === 1 ? "match" : "matches"}. Subject is prefixed with [TEST]. Those items now won't re-send in the next scheduled digest.`,
        });
      }
    } catch (e) {
      setTestResult({ kind: "error", text: (e as Error).message });
    } finally {
      setTestPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              In-app notifications
            </h2>
            <p className="mt-1 text-xs text-muted">
              Always on — the bell in the top nav is the canonical inbox. No opt-out.
            </p>
          </div>
          <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-brand-teal">
            Always on
          </span>
        </header>
      </section>

      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Email digests
          </h2>
          <p className="mt-1 text-xs text-muted">
            Sent via Brevo. Off by default. We never offer hourly — the research is
            unambiguous that hourly compliance email becomes inbox noise within a week.
          </p>
        </header>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium uppercase tracking-wider text-muted">
            Frequency
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(["off", "weekly", "daily"] as const).map((freq) => {
              const active = emailFrequency === freq;
              return (
                <label
                  key={freq}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors ${
                    active
                      ? "border-brand-teal bg-brand-teal/5"
                      : "border-card-border bg-card-bg hover:border-brand-blue/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="email-frequency"
                    checked={active}
                    onChange={() => setEmailFrequency(freq)}
                    className="mt-0.5 h-3.5 w-3.5 border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {freq === "off" ? "Off" : freq === "weekly" ? "Weekly" : "Daily"}
                    </p>
                    <p className="text-xs text-muted">
                      {freq === "off"
                        ? "No email digests."
                        : freq === "weekly"
                          ? "Wednesdays at 07:00 UTC."
                          : "Daily at 06:00 UTC."}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset
          className="mt-5"
          disabled={emailFrequency === "off"}
          aria-disabled={emailFrequency === "off"}
        >
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-card-border bg-card-bg p-3 has-[:disabled]:opacity-60">
            <input
              type="checkbox"
              checked={emailCriticalOnly}
              onChange={(e) => setEmailCriticalOnly(e.target.checked)}
              disabled={emailFrequency === "off"}
              className="mt-0.5 h-3.5 w-3.5 rounded border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Critical-only severity gate
              </p>
              <p className="text-xs text-muted">
                When on, the digest only includes matches with severity = Critical
                (score &ge; 80). Recommended for senior leaders.
              </p>
            </div>
          </label>
        </fieldset>
      </section>

      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Web push
            </h2>
            <p className="mt-1 text-xs text-muted">
              Browser notifications for critical-severity matches. Capped at 3 per 24h
              to prevent fatigue. Phase 1.7 wires the actual service worker; for now
              this toggle just records your intent.
            </p>
          </div>
          <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            Coming Phase 1.7
          </span>
        </header>
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-card-border bg-card-bg p-3">
          <input
            type="checkbox"
            checked={webPushEnabled}
            onChange={(e) => setWebPushEnabled(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-card-border bg-card-bg text-brand-blue focus:ring-brand-blue"
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Enable web-push (CRITICAL only)
            </p>
            <p className="text-xs text-muted">
              Saves the preference. We&apos;ll prompt for browser permission when
              Phase 1.7 ships.
            </p>
          </div>
        </label>
      </section>

      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Test the digest
          </h2>
          <p className="mt-1 text-xs text-muted">
            Preview renders the email HTML in a new tab with no Brevo send.
            Send test runs the real pipeline scoped to your account — useful for
            verifying Brevo is configured. Both ignore the scheduled cron.
          </p>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/regwatch/alerts/preview?mode=daily"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-teal"
          >
            Preview daily digest →
          </a>
          <a
            href="/api/regwatch/alerts/preview?mode=weekly"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-teal"
          >
            Preview weekly digest →
          </a>
          <button
            type="button"
            onClick={onSendTest}
            disabled={testPending}
            className="rounded-md border border-brand-violet/40 bg-brand-violet/10 px-3 py-1.5 text-sm text-brand-violet hover:bg-brand-violet/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testPending ? "Sending…" : "Send test to my email now"}
          </button>
        </div>

        {testResult && (
          <p
            className={`mt-3 text-xs leading-relaxed ${
              testResult.kind === "ok"
                ? "text-brand-teal"
                : testResult.kind === "empty"
                  ? "text-muted"
                  : "text-red-400"
            }`}
          >
            {testResult.text}
          </p>
        )}

        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-muted">
          <p className="font-medium text-amber-300">Brevo IP authorization</p>
          <p className="mt-1 leading-relaxed">
            If Brevo rejects sends with a 401/403, your Brevo account has IP
            authorization enabled and Vercel&apos;s IPs aren&apos;t whitelisted.
            Vercel function IPs rotate, so the cleanest fix is to{" "}
            <span className="font-medium text-foreground">
              disable IP authorization
            </span>{" "}
            in Brevo at{" "}
            <span className="font-mono text-foreground">
              Settings → SMTP &amp; API → Authorized IPs
            </span>{" "}
            (the API key itself remains the auth boundary). Then re-run the test.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-card-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {message ? (
            <span className={message.kind === "ok" ? "text-brand-teal" : "text-red-400"}>
              {message.text}
            </span>
          ) : (
            "Changes take effect from the next digest cycle."
          )}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-blue px-5 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
