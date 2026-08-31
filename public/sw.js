"use strict";
(() => {
  // app/pwa/sw.ts
  var CACHE_NAME = "bcc007portal-cache-v1";
  var STATIC_ASSETS = [
    "/",
    "/assets/",
    "/fonts/",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/manifest.json"
  ];
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then(
        (keys) => Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        ).then(() => self.clients.claim())
      )
    );
  });
  self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    if (url.pathname.endsWith(".data")) {
      event.respondWith(fetch(event.request));
      return;
    }
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.open(CACHE_NAME).then((cache) => cache.add(event.request));
        })
      );
      return;
    }
    if (url.pathname.startsWith("/fonts/")) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.open(CACHE_NAME).then((cache) => cache.add(event.request));
        })
      );
      return;
    }
    if (event.request.mode === "navigate" || url.origin !== self.origin) {
      event.respondWith(fetch(event.request));
      return;
    }
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return caches.open(CACHE_NAME).then((cache) => {
          return fetch(event.request).then((response) => {
            const clone = response.clone();
            try {
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            } catch {
            }
            return response;
          });
        });
      })
    );
  });
})();
