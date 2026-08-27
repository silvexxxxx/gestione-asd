const CACHE_NAME = "gestione-asd-v42";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (e) => {
  self.skipWaiting(); // Forza l'installazione immediata
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(() => self.clients.claim()) // Forza il controllo immediato
  );
});

// Cache-First strategy
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
