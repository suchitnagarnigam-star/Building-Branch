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

  const title = data.title || "MCL Building Branch Notification";
  const options = {
    body: data.body || "New statutory update recorded.",
    tag: data.tag || undefined, // Replaces previous notification with the same tag
    icon: "/mcl-logo.png",
    badge: "/favicon.svg",
    data: {
      url: data.url || "/",
    },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open under the same origin, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }

      // Otherwise open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
