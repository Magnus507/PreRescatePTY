// Legacy service-worker retirement shim.
// Existing installations may still request /sw.js. This worker immediately
// clears PreRescue caches and unregisters itself; it intentionally has no
// fetch handler so all requests go directly to the network/CDN.
const LEGACY_CACHE_PREFIXES = ["prerescate-", "workbox-", "next-pwa-"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
            .map((key) => caches.delete(key)),
        ),
      ),
      self.registration.unregister(),
      self.clients.claim(),
    ]),
  );
});
