// stockElec service worker.
// - Immutable build assets (/_next/static) are served cache-first.
// - Pages and RSC payloads are served network-first with a cache fallback, so
//   the app shell opens without network.
// - Cross-origin requests (Supabase API, storage) are never intercepted here;
//   offline data is handled by the app's local cache.

const VERSION = "v7";
const STATIC_CACHE = `stockelec-static-${VERSION}`;
const PAGES_CACHE = `stockelec-pages-${VERSION}`;
const PRECACHE_URLS = [
  "/",
  "/login",
  "/items",
  "/items/edit",
  "/locations",
  "/locations/labels",
  "/shopping",
  "/more",
  "/search",
  "/add",
  "/scan",
  "/history",
  "/import",
  "/manifest.webmanifest",
  "/pwa-icon/192",
  "/pwa-icon/512",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Unknown page while offline: fall back to the cached home shell.
    if (request.mode === "navigate") {
      const shell = await caches.match("/");
      if (shell) return shell;
    }
    throw error;
  }
}
