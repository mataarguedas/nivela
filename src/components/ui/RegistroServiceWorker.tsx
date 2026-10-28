"use client";

import { useEffect } from "react";

// Registers public/sw.js (CLAUDE.md → PWA) in production builds only: in
// `next dev` a cache-first SW would serve stale chunks across rebuilds.
// Registration waits for `load` so it never competes with the first paint.
// A failure is harmless: the app works the same without a service worker.

export function RegistroServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    };
    if (document.readyState === "complete") {
      registrar();
      return;
    }
    window.addEventListener("load", registrar, { once: true });
    return () => window.removeEventListener("load", registrar);
  }, []);
  return null;
}
