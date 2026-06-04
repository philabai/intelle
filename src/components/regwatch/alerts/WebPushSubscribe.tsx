"use client";

import { useState, useEffect } from "react";
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
    const existing = await navigator.serviceWorker.getRegistration("/regwatch/sw.js");
    if (existing) return existing;
    return navigator.serviceWorker.register("/regwatch/sw.js", { scope: "/regwatch/" });
  }

  async function onSubscribe() {
    if (!vapidPublicKey) {
      setMessage({ kind: "error", text: "VAPID public key not configured on the server." });
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
              ? "Browser blocked notifications. Re-enable them in your browser site settings to subscribe."
              : "Permission dismissed.",
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
        setMessage({ kind: "error", text: res.error ?? "Could not save subscription" });
        await sub.unsubscribe();
        return;
      }
      setStatus("subscribed");
      setMessage({
        kind: "ok",
        text: "Subscribed. You'll get a browser notification when critical matches land (capped at 3 per 24h).",
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
      setMessage({ kind: "info", text: "Unsubscribed. No more browser pushes from this device." });
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
        setMessage({ kind: "error", text: res.error ?? "Send failed" });
        return;
      }
      setMessage({
        kind: "ok",
        text: `Test sent to ${res.delivered} ${res.delivered === 1 ? "device" : "devices"}. You should see a notification within a few seconds.`,
      });
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return <p className="text-xs text-muted">Checking browser support…</p>;
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs text-muted">
        This browser doesn&apos;t support web push. iOS Safari requires installing
        intelle.io to your Home Screen first.
      </p>
    );
  }

  if (status === "no-vapid") {
    return (
      <p className="text-xs text-amber-300">
        Web push is partially configured: the server is missing{" "}
        <span className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</span>. See the README
        for the one-time setup.
      </p>
    );
  }

  if (status === "blocked") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-300">
          Notifications are blocked for this site. To enable, click the lock icon in
          your browser address bar, find Notifications, and switch to Allow. Then
          refresh this page.
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
              {pending ? "Sending…" : "Send test push"}
            </button>
            <button
              type="button"
              onClick={onUnsubscribe}
              disabled={pending}
              className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Unsubscribe this browser
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSubscribe}
            disabled={pending}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Subscribing…" : "Enable browser notifications"}
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
