/* Service worker v134
 *  - Never caches *.supabase.co (per-user JWTs).
 *  - Precaches the app shell (pages, css, js, offline page) so the site works
 *    offline from the very first visit, under any base path (e.g. /JP-Club/).
 *  - All precache URLs are RELATIVE: they resolve against sw.js, so the
 *    GitHub Pages subpath is handled automatically.
 *  - Tolerant per-URL precache (one 404 does not abort the install).
 *  - Navigation fallback: exact match -> ignore query -> directory root
 *    (index/home) -> offline.html.
 */
'use strict';

const VERSION    = 'v134';
const APP_CACHE  = `nihongo-${VERSION}-app`;
const DATA_CACHE = `nihongo-${VERSION}-data`;
const EXT_CACHE  = `nihongo-${VERSION}-ext`;

const PRECACHE = [
  // Pages
  './',
  'index.html',
  'home.html',
  'lesson.html',
  'lessons.html',
  'flashcards.html',
  'quiz.html',
  'kanji.html',
  'search.html',
  'progress.html',
  'placement.html',
  'mimikara.html',
  'auth.html',
  'auth-callback.html',
  'offline.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',

  // CSS
  'css/fonts.css',
  'css/tokens.css',
  'css/design-system.css',
  'css/shell.css',
  'css/a11y.css',
  'css/pwa.css',
  'css/cloud.css',
  'css/auth.css',
  'css/home.css',
  'css/lesson.css',
  'css/audio.css',
  'css/flashcards.css',
  'css/quiz.css',
  'css/kanji.css',
  'css/search.css',
  'css/progress.css',
  'css/placement.css',
  'css/phase13.css',
  'css/toasts.css',
  'css/streak-prompt.css',
  'css/perf.css',
  'css/ai-tutor.css',

  // JS
  'js/theme.js',
  'js/i18n.js',
  'js/shell.js',
  'js/home.js',
  'js/data-schemas.js',
  'js/data-loader.js',
  'js/lesson.js',
  'js/audio-engine.js',
  'js/audio-ui.js',
  'js/srs.js',
  'js/flashcards.js',
  'js/quiz.js',
  'js/kanji.js',
  'js/search.js',
  'js/progress.js',
  'js/placement.js',
  'js/a11y.js',
  'js/a11y-hooks.js',
  'js/pwa.js',
  'js/supabase-config.js',
  'js/cloud.js',
  'js/auth-ui.js',
  'js/toasts.js',
  'js/streak-prompt.js',
  'js/tabs-memory.js',
  'js/cmd-palette.js',
  'js/microcopy.js',
  'js/ai-tutor/utils.js',
  'js/ai-tutor/api.js',
  'js/ai-tutor/voice.js',
  'js/ai-tutor/chat.js',
  'js/ai-tutor/storage.js',
  'js/ai-tutor/widget.js',
  'js/ai-tutor/init.js',

  // Data
  'data/lessons/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const results = await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
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
  return sameOrigin(u.href) && /\/data\/.+\.json$/.test(u.pathname);
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
  } catch (err) { return Response.error(); }
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

async function navigationFallback(req) {
  // 1. exact match
  let hit = await caches.match(req);
  if (hit) return hit;
  // 2. same page, different query (lesson.html?lesson=minna-002 -> lesson.html)
  hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  // 3. directory root (e.g. /JP-Club/) -> index.html / home.html
  const url = new URL(req.url);
  if (url.pathname.endsWith('/')) {
    hit = (await caches.match('./')) ||
          (await caches.match('index.html')) ||
          (await caches.match('home.html'));
    if (hit) return hit;
  }
  // 4. offline page
  return (await caches.match('offline.html')) ||
    new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache Supabase traffic.
  if (isSupabase(req.url)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        // Only cache clean 200s. Redirected responses must not be reused
        // for navigations (browsers reject them).
        if (response.ok && !response.redirected) {
          const copy = response.clone();
          event.waitUntil(caches.open(APP_CACHE).then((c) => c.put(req, copy)));
        }
        return response;
      } catch (err) {
        return navigationFallback(req);
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
        cache.put(req, response.clone());
      }
      return response;
    } catch (err) { return (await caches.match(req)) || Response.error(); }
  })());
});
