const CACHE_NAME = 'nfl-trivia-cache-v2';
const APP_SHELL = ['/', '/index.html', '/src/styles.css'];

// Service worker event types
type InstallEvent = Event & { waitUntil: (promise: Promise<unknown>) => void };
type ActivateEvent = Event & { waitUntil: (promise: Promise<unknown>) => void };
type FetchEventType = Event & {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
};

self.addEventListener('install', (event: Event) => {
  const installEvent = event as InstallEvent;
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', (event: Event) => {
  const activateEvent = event as ActivateEvent;
  activateEvent.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? undefined : caches.delete(k)))),
    ),
  );
});

self.addEventListener('fetch', (event: Event) => {
  const fetchEvent = event as FetchEventType;
  const req = fetchEvent.request;
  const url = new URL(req.url);

  // Network-first for data files (ensure fresh data)
  if (url.pathname.startsWith('/data/')) {
    fetchEvent.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes.clone()));
          }
          return networkRes;
        })
        .catch(() => {
          // Fall back to cache if network fails (offline support)
          return caches.match(req).then((cached) => cached || Response.error());
        }),
    );
  }
  // Cache-first for app shell
  else if (APP_SHELL.includes(url.pathname)) {
    fetchEvent.respondWith(
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
