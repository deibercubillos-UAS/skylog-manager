/**
 * Service worker propio de ARDIS. Registrado con scope '/ardis/' — separado
 * del de Bitafly (public/sw.js, scope '/'), así que coexisten sin pisarse:
 * cada uno solo recibe eventos push de las suscripciones creadas bajo su
 * propio registro. Solo push + click de notificación, sin caché.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ARDIS', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ARDIS', {
      body: data.body || '',
      icon: '/ardis/icons/icon-192.png',
      badge: '/ardis/icons/icon-192.png',
      data: { url: data.url || '/ardis' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/ardis';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(target) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
