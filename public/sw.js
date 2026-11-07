// Brick Drop service worker.
//
// The phone keeps this script around in the background. When a push
// message arrives (even with the app closed), the phone wakes it up and it
// shows the notification.
//
// Deliberately NO offline caching (no "fetch" handler): caching pages is the
// #1 source of "why am I seeing an old version?" bugs, and iOS doesn't need
// it to install the app or receive pushes.

self.addEventListener("install", () => {
  // Activate a new version right away instead of waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  // iOS rule: EVERY push must show a visible notification. If we ever skip
  // one, Safari can revoke the subscription. So we always show something.
  const title = data.title || "Brick Drop";
  const options = {
    body: data.body || "Something new dropped!",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag, // same tag replaces an older notification instead of stacking
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    (async () => {
      // The red number on the Home Screen icon. (Supported on iOS 16.4+
      // for installed apps; harmless to skip elsewhere.)
      if (typeof data.badge === "number" && self.navigator.setAppBadge) {
        await self.navigator.setAppBadge(data.badge).catch(() => {});
      }
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      // If the app is already open, focus it and navigate; otherwise open it.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
