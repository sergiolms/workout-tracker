const CACHE = 'base-shell-v5';
const BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, '');
const SHELL = `${BASE_PATH || ''}/`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('base-shell-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(SHELL)) || Response.error()));
    return;
  }

  event.respondWith(fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, clone));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || Response.error()));
});
