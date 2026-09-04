const CACHE_NAME = "gestione-asd-v2.4.16";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

// Install: pre-cache asset essenziali e skipWaiting immediato
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: pulizia immediata di tutte le vecchie cache e claim dei client
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Eliminazione vecchia cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener: riceve SKIP_WAITING dalla pagina principale
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SKIP_WAITING" || event.data === "skipWaiting")) {
    self.skipWaiting();
  }
});

// Fetch Strategy:
// - Network-First con fallback su Cache per la navigazione HTML (garantisce sempre l'ultima versione quando online)
// - Cache-First con background revalidation per gli altri asset statici (icone, manifest)
self.addEventListener("fetch", (e) => {
  if (!e.request.url.startsWith("http")) return;

  const isNavigation = e.request.mode === "navigate" || 
                       e.request.destination === "document" || 
                       e.request.url.endsWith("index.html") ||
                       e.request.url.endsWith("/");

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request).then((cached) => cached || caches.match("./index.html"));
        })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(e.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
