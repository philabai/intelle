/* eslint-disable */
/**
 * intelle.io RegWatch service worker (Phase 1.7)
 *
 * Lives at /regwatch/sw.js so its default scope is /regwatch/ — won't
 * interfere with the rest of intelle.io. Three responsibilities:
 *
 *   1. Receive web push events from the browser's push service.
 *   2. Display a notification using the payload our server sent.
 *   3. On notification click, focus an existing /regwatch/* tab or open one.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "RegWatch", body: event.data.text(), url: "/regwatch/feed" };
  }

  const title = payload.title || "RegWatch";
  const options = {
    body: payload.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: payload.url || "/regwatch/feed" },
    requireInteraction: payload.severity === "critical",
    tag: payload.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/regwatch/feed";
  const absolute = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            await client.focus();
            if (client.url !== absolute) {
              await client.navigate(absolute);
            }
            return;
          }
        } catch (e) {
          // Ignore clients with opaque URLs.
        }
      }
      await self.clients.openWindow(absolute);
    })(),
  );
});
