/* Service worker v16 (Phase 3, batch 1).
 *  - Never caches *.supabase.co (per-user JWTs).
 *  - Precaches auth pages + cloud config + cloud scripts.
 *  - Tolerant per-URL precache (one 404 does not abort the install).
 */
'use strict';

const VERSION    = 'v133';
const APP_CACHE  = `nihongo-${VERSION}-app`;
const DATA_CACHE = `nihongo-${VERSION}-data`;
const EXT_CACHE  = `nihongo-${VERSION}-ext`;

const PRECACHE = [
  'css/ai-tutor.css',
  'js/ai-tutor/utils.js',
  'js/ai-tutor/api.js',
  'js/ai-tutor/voice.js',
  'js/ai-tutor/chat.js',
  'js/ai-tutor/storage.js',
  'js/ai-tutor/widget.js',
  'js/ai-tutor/init.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const results = await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    const failed = PRECACHE.filter((_, i) => results[i].status === 'rejected');
    if (failed.length) console.warn('[sw] precache skipped', failed);
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.indexOf(`nihongo-${VERSION}-`) !== 0)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function sameOrigin(url) { return new URL(url, self.location.origin).origin === self.location.origin; }
function isSupabase(url) { try { return new URL(url).hostname.endsWith('.supabase.co'); } catch (e) { return false; } }
function isDataJSON(url) {
  const u = new URL(url, self.location.origin);
  return sameOrigin(u.href) && /\/data\/lessons\/.+\.json$/.test(u.pathname);
}
function isKanjiVG(url) {
  const u = new URL(url, self.location.origin);
  return u.hostname === 'cdn.jsdelivr.net' && u.pathname.indexOf('/kanjivg/') !== -1;
}
function isFont(url) {
  const u = new URL(url, self.location.origin);
  return u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
}
function isStaticAsset(url) {
  const u = new URL(url, self.location.origin);
  return sameOrigin(u.href) && /\.(css|js|svg|png|webp|woff2?|webmanifest)$/.test(u.pathname);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) { return cached || Response.error(); }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Phase 12 — never cache Supabase traffic.
  if (isSupabase(req.url)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        const cache = await caches.open(APP_CACHE);
        cache.put(req, response.clone());
        return response;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return (await caches.match('offline.html')) ||
          new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  if (isDataJSON(req.url)) { event.respondWith(staleWhileRevalidate(req, DATA_CACHE)); return; }
  if (isKanjiVG(req.url) || isFont(req.url)) { event.respondWith(cacheFirst(req, EXT_CACHE)); return; }
  if (isStaticAsset(req.url)) { event.respondWith(cacheFirst(req, APP_CACHE)); return; }

  event.respondWith((async () => {
    try {
      const response = await fetch(req);
      if (response.ok) {
        const cache = await caches.open(EXT_CACHE);
        cache.put(request_or(req), response.clone());
      }
      return response;
    } catch (err) { return (await caches.match(req)) || Response.error(); }
  })());
});

// fallback helper used above
function request_or(req) { return req; }
