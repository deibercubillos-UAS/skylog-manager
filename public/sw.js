/**
 * Bitafly Service Worker
 *
 * Estrategia de caché optimizada para controles DJI Enterprise (RC Plus,
 * Smart Controller) que operan en zonas rurales con conectividad intermitente.
 *
 * Cache layers:
 *   STATIC_CACHE  — assets /_next/static/* (inmutables, content-hashed)
 *   PAGES_CACHE   — páginas del dashboard (stale-while-revalidate)
 *   API_CACHE     — NUNCA se cachea — siempre network-only
 *
 * Offline fallback: /offline.html si la red falla y la página no está en caché.
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE  = `bitafly-static-${CACHE_VERSION}`;
const PAGES_CACHE   = `bitafly-pages-${CACHE_VERSION}`;
const OFFLINE_URL   = '/offline.html';

// Assets del shell que se pre-cachean en el install
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/dashboard',
  '/fonts/material-symbols-outlined.woff2',
];

// ── Install: pre-cachear el shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches viejos ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia por tipo de recurso ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar same-origin y https
  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // 1. API calls — NUNCA cachear, siempre network-only
  if (url.pathname.startsWith('/api/')) {
    return; // deja pasar al navegador sin intervención
  }

  // 2. Assets estáticos de Next.js — cache-first (son inmutables por content-hash)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // 3. Imágenes y fuentes — cache-first con red como fallback
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // 4. Páginas del dashboard — network-first
  //    Siempre intenta la red primero para que tras un deploy el HTML (y sus chunks)
  //    estén frescos → evita ChunkLoadError por HTML cacheado viejo. La caché solo
  //    es respaldo offline. El app nativo (Capacitor) así siempre refleja la web.
  if (url.pathname.startsWith('/dashboard') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.open(PAGES_CACHE).then(cache =>
            cache.match(request).then(cached => cached || caches.match(OFFLINE_URL))
          )
        )
    );
    return;
  }
});

// ── Push notifications (futuro) ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Bitafly', {
        body:  data.body  || '',
        icon:  '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data:  { url: data.url || '/dashboard' },
      })
    );
  } catch {
    // payload no es JSON — ignorar
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(target) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
