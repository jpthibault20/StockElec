"use client";

import { useEffect } from "react";

// Registers the hand-written service worker (public/sw.js) in production only,
// so the dev server is never served stale assets.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => console.error("Service worker registration failed", error));
  }, []);
  return null;
}
