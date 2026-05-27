const CACHE_NAME = 'prerescate-v2.8';

const URLS_TO_CACHE = [
  '/manifest.json',
  '/favicon.ico',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache Next.js build assets/chunks, any API routes, or HTML navigations.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    request.mode === 'navigate' ||
    request.destination === 'document'
  ) {
    event.respondWith(fetch(request));
    return;
  }

  const isSafeStaticAsset =
    request.method === 'GET' && (
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/favicon.ico' ||
      /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname)
    );

  if (!isSafeStaticAsset) {
    event.respondWith(fetch(request));
    return;
  }

  // Stale-while-revalidate only for safe static assets.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
