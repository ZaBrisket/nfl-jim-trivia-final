const CACHE_NAME = 'nfl-trivia-cache-v1';
const APP_SHELL = ['/', '/index.html', '/src/styles.css'];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? undefined : caches.delete(k)))),
    ),
  );
});

self.addEventListener('fetch', (event: any) => {
  const req = event.request as Request;
  const url = new URL(req.url);
  // Cache-first for data and app shell
  if (url.pathname.startsWith('/data/') || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes.clone()));
          }
          return networkRes;
        }).catch(() => cached || Response.error());
        return cached || fetchPromise;
      }),
    );
  }
});
