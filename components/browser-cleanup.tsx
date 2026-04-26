"use client";

import { useEffect } from "react";

export function BrowserCleanup() {
  useEffect(() => {
    async function cleanup() {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    }

    cleanup().catch(() => undefined);
  }, []);

  return null;
}
