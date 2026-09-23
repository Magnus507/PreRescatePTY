"use client";

import { useEffect } from "react";

const LEGACY_CACHE_PREFIXES = ["prerescate-", "workbox-", "next-pwa-"];

/**
 * One-time cleanup for the legacy PWA/service-worker layer.
 * The public site no longer registers an offline worker because it caused
 * Safari to keep stale static assets across deployments.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    const cleanup = async () => {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
            .map((key) => caches.delete(key)),
        );
      }
    };

    cleanup().catch(() => {
      // Cache cleanup is best-effort and must never block rendering.
    });
  }, []);

  return null;
}
