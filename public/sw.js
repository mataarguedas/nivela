// Nivela service worker (CLAUDE.md → PWA). Deliberately minimal:
// - cache-first for /_next/static/* (content-hashed, immutable) and /icons/*;
// - everything else goes straight to the network: the SW never answers it, so
//   /api/*, pages and any HTML that depends on the session are never cached.
// Rating needs the network anyway (PRD §3 non-goals: no offline rating); the
// drafts live in localStorage, not here.

const CACHE = "nivela-estaticos-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres.filter((nombre) => nombre.startsWith("nivela-") && nombre !== CACHE).map((nombre) => caches.delete(nombre)),
      );
      await self.clients.claim();
    })(),
  );
});

function esEstatico(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!esEstatico(url)) return; // network only: the browser handles it as if there were no SW

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const guardada = await cache.match(request);
      if (guardada) return guardada;
      const respuesta = await fetch(request);
      // Only complete, same-origin 200s: never a redirect to /acceso or an error page.
      if (respuesta.ok && respuesta.type === "basic" && respuesta.status === 200) {
        event.waitUntil(cache.put(request, respuesta.clone()));
      }
      return respuesta;
    })(),
  );
});
