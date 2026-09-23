"use client";

import { useEffect } from "react";

const LEGACY_CACHE_PREFIXES = ["prerescate-", "workbox-", "next-pwa-"];

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    let cancelled = false;

    const cleanupLegacyOfflineState = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (cancelled) return;
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const names = await caches.keys();
          if (cancelled) return;
          await Promise.all(
            names
              .filter((name) => LEGACY_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
              .map((name) => caches.delete(name)),
          );
        }
      } catch {
        // Cache cleanup is best-effort and must never block the public page.
      }
    };

    void cleanupLegacyOfflineState();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
