const CACHE = 'artiststage-v2';

// On install: cache the app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/index.html']))
  );
  self.skipWaiting();
});

// On activate: remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigation requests (HTML pages) → network first, fallback to /index.html
// - Static assets (JS/CSS/images) → cache first, update in background
// - API / Supabase / Stripe → network only (never cache)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, cross-origin API calls
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('stripe.com')) return;
  if (url.hostname.includes('resend.com')) return;

  // Navigation → network first, fallback SPA shell
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets → cache first, network fallback + update cache
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
