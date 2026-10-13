// Service Worker for MCL Building Branch (MCL-BB) Push Notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "MCL Building Branch", body: event.data.text() };
    }
  }

  const title = data.title || "MCL Building Branch Alert";
  const options = {
    body: data.body || "New statutory update recorded.",
    tag: data.tag || undefined, // Deduplicates / groups notices
    renotify: Boolean(data.tag), // Vibrate/ring again on replace
    icon: "/icon-192.png", // Sharp mobile/desktop notification icon
    badge: "/favicon.svg", // Status bar icon on Android
    vibrate: [300, 150, 300, 150, 300], // Vibrate alert for phone in pocket/locked
    timestamp: Date.now(),
    requireInteraction: true, // Keep notification visible on screen until user interacts
    data: {
      url: data.url || "/",
    },
    actions: [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const rawTarget = event.notification.data?.url || "/";
  // Support both hash-based routes (e.g. /cases/123 -> /#/cases/123) and absolute URLs
  const targetHashRoute = rawTarget.startsWith("#") ? rawTarget : `#${rawTarget.startsWith("/") ? "" : "/"}${rawTarget}`;
  const fullTargetUrl = new URL(rawTarget.startsWith("/") ? `/#${rawTarget}` : rawTarget, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open under the same origin, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) {
            client.navigate(fullTargetUrl);
          }
          return;
        }
      }

      // Otherwise open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});
