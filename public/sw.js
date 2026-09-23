const CACHE_PREFIXES = ['prerescate-', 'workbox-', 'next-pwa-'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
        .map((name) => caches.delete(name))
    );

    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'PRERESCUE_LEGACY_SW_REMOVED' });
    }
  })());
});

self.addEventListener('fetch', () => {
  // Intentionally empty: this worker exists only to retire older cached workers.
});
