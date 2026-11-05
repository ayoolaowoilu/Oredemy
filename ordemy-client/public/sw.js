self.addEventListener("push", (event) => {
  const message = event.data?.json() ?? {};
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.some((client) => client.focused)) return undefined;
      return self.registration.showNotification(message.title ?? "New Ordemy message", {
        body: message.body ?? "You have a new message.",
        icon: "/favicon.svg",
        data: { url: message.url ?? "/dashboard" },
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(target).then(() => existing.focus());
      }
      return self.clients.openWindow(target);
    }),
  );
});
