const CACHE_NAME = 'jdf-shell-v3';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

// Solo cacheamos el shell estático. No interceptamos ni guardamos llamadas a Firebase,
// documentos autenticados, ni respuestas de API con datos privados.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/__/') || url.pathname.includes('firestore') || url.pathname.includes('identitytoolkit')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    // Vite emite assets con hash: son inmutables y seguros para cache-first.
    // Esto acelera módulos y estilos ya visitados sin guardar respuestas privadas.
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          });
        })
      );
      return;
    }
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request))
    );
  }
});
