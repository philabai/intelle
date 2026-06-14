"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPushToMe,
} from "@/lib/regwatch/push-actions";

interface Props {
  vapidPublicKey: string | null;
}

type Status =
  | "unsupported"
  | "blocked"
  | "no-vapid"
  | "loading"
  | "subscribed"
  | "available";

/**
 * Browser permission + subscription flow for web push. Renders one of five
 * states depending on browser support, current permission, and whether the
 * user has an active subscription. Subscribe button asks for permission,
 * registers the SW, calls pushManager.subscribe(), and POSTs the result to
 * a server action so the backend can later send pushes.
 */
export function WebPushSubscribe({ vapidPublicKey }: Props) {
  const t = useTranslations("regwatch.monitor");
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  // Resolve the current state on mount + when the tab regains focus.
  useEffect(() => {
    let cancelled = false;
    async function probe() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (!vapidPublicKey) {
        if (!cancelled) setStatus("no-vapid");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/regwatch/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "subscribed" : "available");
      } catch {
        if (!cancelled) setStatus("available");
      }
    }
    probe();
    window.addEventListener("focus", probe);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", probe);
    };
  }, [vapidPublicKey]);

  async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
    // Register if missing — register() resolves with the registration but the
    // service worker itself may still be "installing" at that point.
    const existing = await navigator.serviceWorker.getRegistration("/regwatch/sw.js");
    if (!existing) {
      await navigator.serviceWorker.register("/regwatch/sw.js", {
        scope: "/regwatch/",
      });
    }

    // CRITICAL: pushManager.subscribe() requires reg.active to exist. On a
    // first-time subscribe the worker is mid-install when register() returns,
    // which is exactly what produces "Subscription failed - no active Service
    // Worker". `navigator.serviceWorker.ready` resolves only when there is an
    // active SW whose scope covers the current page, so awaiting it bridges
    // the install -> activate transition for us.
    return navigator.serviceWorker.ready;
  }

  async function onSubscribe() {
    if (!vapidPublicKey) {
      setMessage({ kind: "error", text: t("pushNoVapidKey") });
      return;
    }
    setMessage(null);
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "available");
        setMessage({
          kind: "info",
          text:
            permission === "denied"
              ? t("pushPermissionDenied")
              : t("pushPermissionDismissed"),
        });
        return;
      }
      const reg = await ensureRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON();
      const res = await subscribeToPush({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        userAgent: navigator.userAgent,
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: res.error ?? t("pushSaveSubError") });
        await sub.unsubscribe();
        return;
      }
      setStatus("subscribed");
      setMessage({
        kind: "ok",
        text: t("pushSubscribed"),
      });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setPending(false);
    }
  }

  async function onUnsubscribe() {
    setMessage(null);
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/regwatch/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribeFromPush({ endpoint });
      }
      setStatus("available");
      setMessage({ kind: "info", text: t("pushUnsubscribed") });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setPending(false);
    }
  }

  async function onTest() {
    setMessage(null);
    setPending(true);
    try {
      const res = await sendTestPushToMe();
      if (!res.ok) {
        setMessage({ kind: "error", text: res.error ?? t("pushTestSendError") });
        return;
      }
      setMessage({
        kind: "ok",
        text: t("pushTestSent", { count: res.delivered ?? 0 }),
      });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return <p className="text-xs text-muted">{t("pushChecking")}</p>;
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs text-muted">
        {t("pushUnsupported")}
      </p>
    );
  }

  if (status === "no-vapid") {
    return (
      <p className="text-xs text-amber-300">
        {t.rich("pushNoVapid", {
          code: (chunks) => <span className="font-mono">{chunks}</span>,
        })}
      </p>
    );
  }

  if (status === "blocked") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-300">
          {t("pushBlocked")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "subscribed" ? (
          <>
            <button
              type="button"
              onClick={onTest}
              disabled={pending}
              className="rounded-md border border-brand-violet/40 bg-brand-violet/10 px-3 py-1.5 text-xs text-brand-violet hover:bg-brand-violet/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? t("pushSending") : t("pushSendTest")}
            </button>
            <button
              type="button"
              onClick={onUnsubscribe}
              disabled={pending}
              className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              {t("pushUnsubscribeBrowser")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSubscribe}
            disabled={pending}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t("pushSubscribing") : t("pushEnable")}
          </button>
        )}
      </div>

      {message && (
        <p
          className={`text-xs leading-relaxed ${
            message.kind === "ok"
              ? "text-brand-teal"
              : message.kind === "error"
                ? "text-red-400"
                : "text-muted"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

/**
 * Standard converter — the browser's PushManager expects applicationServerKey
 * as an ArrayBuffer-backed Uint8Array, but VAPID keys are exchanged as
 * base64url strings. We build over an explicit ArrayBuffer to satisfy the
 * stricter typing introduced with PushManager.subscribe in recent lib.dom.d.ts.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}
