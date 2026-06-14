"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveAlertPrefs, sendTestDigestNow } from "@/lib/regwatch/alerts-actions";
import type { UserAlertPrefs } from "@/lib/regwatch/alerts";
import { WebPushSubscribe } from "./WebPushSubscribe";

interface Props {
  initial: UserAlertPrefs;
  vapidPublicKey: string | null;
}

export function AlertPrefsForm({ initial, vapidPublicKey }: Props) {
  const t = useTranslations("regwatch.monitor");
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
        setMessage({ kind: "error", text: res.error ?? t("prefsSaveError") });
        return;
      }
      setMessage({ kind: "ok", text: t("prefsSaved") });
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
          text: res.error ?? t("testSendError"),
        });
      } else if (!res.sent) {
        setTestResult({
          kind: "empty",
          text: t("testNoMatches", {
            pulled: res.diagnostics.pulled,
            afterCriticalGate: res.diagnostics.afterCriticalGate,
            afterDedup: res.diagnostics.afterDedup,
          }),
        });
      } else {
        setTestResult({
          kind: "ok",
          text: t("testSent", { count: res.matchCount }),
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
              {t("inAppTitle")}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {t("inAppBody")}
            </p>
          </div>
          <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-brand-teal">
            {t("alwaysOn")}
          </span>
        </header>
      </section>

      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("emailTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("emailBody")}
          </p>
        </header>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("frequencyLegend")}
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
                      {freq === "off"
                        ? t("freqOff")
                        : freq === "weekly"
                          ? t("freqWeekly")
                          : t("freqDaily")}
                    </p>
                    <p className="text-xs text-muted">
                      {freq === "off"
                        ? t("freqOffDesc")
                        : freq === "weekly"
                          ? t("freqWeeklyDesc")
                          : t("freqDailyDesc")}
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
                {t("criticalGateTitle")}
              </p>
              <p className="text-xs text-muted">
                {t("criticalGateBody")}
              </p>
            </div>
          </label>
        </fieldset>
      </section>

      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("webPushTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("webPushBody")}
          </p>
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
              {t("webPushOptInTitle")}
            </p>
            <p className="text-xs text-muted">
              {t("webPushOptInBody")}
            </p>
          </div>
        </label>

        <div className="mt-4 border-t border-card-border pt-4">
          <WebPushSubscribe vapidPublicKey={vapidPublicKey} />
        </div>
      </section>

      <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
        <header>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("testTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("testBody")}
          </p>
        </header>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/regwatch/alerts/preview?mode=daily"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-teal"
          >
            {t("previewDaily")}
          </a>
          <a
            href="/api/regwatch/alerts/preview?mode=weekly"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-sm text-foreground hover:border-brand-teal"
          >
            {t("previewWeekly")}
          </a>
          <button
            type="button"
            onClick={onSendTest}
            disabled={testPending}
            className="rounded-md border border-brand-violet/40 bg-brand-violet/10 px-3 py-1.5 text-sm text-brand-violet hover:bg-brand-violet/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testPending ? t("testSending") : t("testSendNow")}
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
          <p className="font-medium text-amber-300">{t("brevoTitle")}</p>
          <p className="mt-1 leading-relaxed">
            {t.rich("brevoBody", {
              bold: (chunks) => (
                <span className="font-medium text-foreground">{chunks}</span>
              ),
              path: (chunks) => (
                <span className="font-mono text-foreground">{chunks}</span>
              ),
            })}
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
            t("changesTakeEffect")
          )}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-blue px-5 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("saving") : t("savePreferences")}
        </button>
      </div>
    </form>
  );
}
