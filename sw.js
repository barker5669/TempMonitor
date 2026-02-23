// ─── INCREMENT THIS VERSION every time you push new code ───────────────────
// e.g. 'bloom-v2', 'bloom-v3', etc.
// This is the ONLY line you need to change to bust the cache for all users.
const CACHE_VERSION = 'bloom-v2';
// ───────────────────────────────────────────────────────────────────────────

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install: cache all assets under the versioned cache name
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait for old tabs to close
  );
});

// Activate: delete ALL old cache versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION) // delete anything that isn't current version
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// Fetch: network-first for HTML (so updates are always picked up),
// cache-first for everything else (fonts, icons etc.)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network-first for the main HTML page
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update the cache with the fresh response
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // fall back to cache if offline
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
