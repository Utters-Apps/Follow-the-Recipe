const CACHE_NAME = 'sigaareceita-cache-v4';
const PRECACHE_URLS = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/icon-192.png', '/icon-512.png',
  '/ui.js', '/app.js', '/data.js', '/audio.js', '/service-worker.js',
  '/usr/share/sounds/click.mp3', '/usr/share/sounds/success.mp3',
  '/usr/share/sounds/error.mp3', '/usr/share/sounds/buy.mp3', '/usr/share/sounds/timer_warning.mp3',
  '/usr/share/sounds/rush_hour.mp3', '/usr/share/sounds/purr.mp3', '/usr/share/sounds/rank_up.mp3',
  '/mascarpone.mp3', '/couve.mp3', '/carne_seca.mp3', '/repolho.mp3', '/polvo.mp3',
  '/farinha.mp3', '/molho_okono.mp3', '/acucar.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)))
  );
  event.waitUntil(self.clients.claim());
  if (self.registration.navigationPreload) {
    event.waitUntil(self.registration.navigationPreload.enable());
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  // Image fallback when offline
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp=>{
        const copy=resp.clone(); caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)); return resp;
      }).catch(()=>{
        // if no cached image provide a simple offline placeholder (use cached icon if available)
        return caches.match('/icon-192.png') || new Response('',{status:200, headers:{'Content-Type':'image/png'}});
      }))
    );
    return;
  }

  // Navigation requests: try network first, then return cached index.html so the SPA works offline
  if (event.request.mode === 'navigate' || (requestUrl.origin === location.origin && requestUrl.pathname.endsWith('.html'))) {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          const resp = await fetch(event.request);
          // Update cache with latest navigation document (index.html/offline.html) when online
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone)).catch(()=>{});
          return resp;
        } catch (e) {
          // If offline, prefer serving cached index.html so the game SPA can bootstrap fully
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;
          // fallback to offline page if index not cached
          return caches.match('/offline.html');
        }
      })()
    );
    return;
  }

  // For other assets use stale-while-revalidate, but prefer cache if network fails
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(()=>null);
      return cached || networkFetch;
    })
  );
});

// Immediate activation on message
self.addEventListener('message', (evt) => {
  if (evt.data && evt.data.type === 'SKIP_WAITING') self.skipWaiting();
});

