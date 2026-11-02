/* Service worker v16 (Phase 3, batch 1).
 *  - Never caches *.supabase.co (per-user JWTs).
 *  - Precaches auth pages + cloud config + cloud scripts.
 *  - Tolerant per-URL precache (one 404 does not abort the install).
 */
'use strict';

const VERSION    = 'v111';
const APP_CACHE  = `nihongo-${VERSION}-app`;
const DATA_CACHE = `nihongo-${VERSION}-data`;
const EXT_CACHE  = `nihongo-${VERSION}-ext`;

const PRECACHE = [
  'js/nav-force.js',
  'images/lessons/minna-017.webp',
  'images/lessons/minna-016.webp',
  'images/lessons/minna-015.webp',
  'images/lessons/minna-014.webp',
  'images/lessons/minna-013.webp',
  'images/lessons/minna-012.webp',
  'images/lessons/minna-011.webp',
  'images/lessons/minna-010.webp',
  'images/lessons/minna-009.webp',
  'images/lessons/minna-008.webp',
  'images/lessons/minna-007.webp',
  'images/lessons/minna-006.webp',
  'images/lessons/minna-005.webp',
  'images/lessons/minna-004.webp',
  'images/lessons/minna-003.webp',
  'images/lessons/minna-002.webp',
  'images/lessons/minna-001.webp',
  'js/lesson-cover.js',
  'content/microcopy.json',
  'js/microcopy.js',
  'js/bookmark-toasts.js',
  'js/empty-states.js',
  'js/rm-timeout.js',
  'js/search-q.js',
  'content/shinkanzen/index.json',
  'content/mimikara/index.json',
  'js/tracks.js',
  'css/tracks.css',
  'shinkanzen.html',
  'mimikara.html',
  'content/grammar-ref.json',
  'js/grammar-ref-link.js',
  'js/grammar-ref.js',
  'css/grammar-ref.css',
  'grammar.html',
  'icons/icon-512.png',
  'icons/icon-192.png',
  'js/kanji-audio.js',
  'css/kanji-audio.css',
  'js/a11y-hooks.js',
  'css/perf.css',
  'js/cmd-palette.js',
  'css/cmd-palette.css',
  'js/tabs-memory.js',
  'js/streak-prompt.js',
  'js/toasts.js',
  'css/streak-prompt.css',
  'css/toasts.css',
  'css/typography-jp.css',
  'js/toast.js',
  'js/study-btn.js',
  'css/home-fix.css',
  'js/home-hero.js',
  'css/tokens-extra.css',
  'js/nav-extra.js',
  'js/a11y-extra.js',
  'css/fonts.css',
  'css/tailwind.css',
  'lessons.html',
  'css/theme-v2.css',
  'css/lessons.css',
  'js/v2-motion.js',
  'js/lessons.js',
  'home.html', 'lessons.html', 'lesson.html', 'flashcards.html', 'quiz.html', 'kanji.html',
  'search.html', 'progress.html', 'placement.html',
  'auth.html', 'auth-callback.html',
  'offline.html', 'manifest.webmanifest',

  'css/tokens.css', 'css/design-system.css', 'css/shell.css', 'css/phase13.css',
  'css/home.css', 'css/lesson.css', 'css/audio.css',
  'css/flashcards.css', 'css/quiz.css', 'css/kanji.css',
  'css/search.css', 'css/progress.css', 'css/placement.css',
  'css/pwa.css', 'css/a11y.css',
  'css/auth.css', 'css/cloud.css', 'css/content-status.css',

  'js/theme.js', 'js/i18n.js', 'js/main.js', 'js/shell.js', 'js/phase13-shell.js', 'js/home.js',
  'js/data-schemas.js', 'js/data-loader.js', 'js/lessons.js',
  'js/audio-engine.js', 'js/audio-ui.js',
  'js/srs.js', 'js/flashcards.js',
  'js/quiz.js', 'js/kanji.js',
  'js/search.js', 'js/progress.js', 'js/placement.js',
  'js/a11y.js', 'js/pwa.js',
  'js/supabase-config.js', 'js/cloud.js', 'js/auth-ui.js', 'js/store.js', 'js/content-status.js',

  'icons/icon.svg', 'icons/icon-maskable.svg',

  'data/lessons/index.json', 'data/lessons/status.json',
  'data/lessons/minna-001/manifest.json',
  'data/lessons/minna-001/vocabulary.json',
  'data/lessons/minna-001/grammar.json',
  'data/lessons/minna-001/kanji.json',
  'data/lessons/minna-001/reading.json',
  'data/lessons/minna-001/listening.json',
  'data/lessons/minna-001/practice.json',
  'data/lessons/minna-002/manifest.json',
  'data/lessons/minna-002/vocabulary.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const results = await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
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
