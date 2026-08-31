const CACHE_NAME = "bcc007portal-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/assets/",
  "/fonts/",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
];

// Install: Cache static assets that rarely change
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ).then(() => self.clients.claim())
    )
  );
});

// Fetch: Strategy-based routing
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. .data requests: NEVER cache — React Router loader data revalidation
  if (url.pathname.endsWith(".data")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Assets: cache-first (content-hashed, immutable)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return caches.open(CACHE_NAME).then((cache) => cache.add(event.request));
      })
    );
    return;
  }

  // 3. Fonts: cache-first (versioned, safe to cache)
  if (url.pathname.startsWith("/fonts/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return caches.open(CACHE_NAME).then((cache) => cache.add(event.request));
      })
    );
    return;
  }

  // 4. Navigations and third-party: passthrough (browser handles natively)
  if (event.request.mode === "navigate" || url.origin !== self.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 5. Everything else: cache-first (scripts, styles, etc.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          try {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          } catch {}
          return response;
        });
      });
    })
  );
});