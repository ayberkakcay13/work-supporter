// Service worker: sadece bildirimler için (çevrimdışı önbellek yok).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Sunucudan gelen push (sayaç süresi doldu).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Çalışma Planlayıcı", {
      body: data.body || "",
      tag: data.tag || "sayac",
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/sayac" },
    }),
  );
});

// Bildirime dokununca: açık pencere varsa ona geç, yoksa uygulamayı aç.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/sayac", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus().then((c) => (c && "navigate" in c ? c.navigate(url) : c));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
