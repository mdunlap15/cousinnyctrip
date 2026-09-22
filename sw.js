// Tatyana in New York — offline support
// Strategy: network-first for the app shell (index.html, app.js, app.css, data/*, config.js)
// so pushed edits go live on next launch; cache-first for fonts, icons and map tiles' CSS.
// ██ Bump CACHE whenever trip.ics or the icons change. ██
const CACHE = 'nyc-2026-v2';
const CORE = ['./', './index.html', './app.css', './app.js', './config.js', './data/geo.js', './data/plan.js', './data/places.js', './data/guide.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png', './trip.ics'];
const SHELL = /(\/|\.html|app\.js|app\.css|config\.js|\/data\/[^/]+\.js)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live data & APIs: always network, never cache
  if (['open-meteo.com', 'supabase.co', 'railway.app', 'openstreetmap.org', 'cartocdn.com', 'basemaps.cartocdn.com'].some((d) => url.hostname === d || url.hostname.endsWith('.' + d))) return;

  // App shell (same origin): network first, fall back to cache when offline
  if (url.origin === location.origin && (req.mode === 'navigate' || SHELL.test(url.pathname))) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './index.html' : req, copy));
          return res;
        })
        .catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req))
    );
    return;
  }

  // Everything else (fonts, icons, Leaflet): cache-first, populate on first use
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && (url.protocol === 'https:' || url.origin === location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
