const CACHE_VERSION = 'jp-club-v14.4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const CORE_ASSETS = [
  './',
  './home.html',
  './lessons.html',
  './lesson.html',
  './flashcards.html',
  './kanji.html',
  './grammar.html',
  './quiz.html',
  './progress.html',
  './search.html',
  './offline.html',
  './css/tokens.css',
  './css/design-system.css',
  './css/shell.css',
  './js/security/sanitize.js',
  './js/security/jp-auth.js',
  './js/store.js',
  './js/data-loader.js",
  "./js/lesson-cover.js",
  "./js/lesson-questions.js",
  "./js/lesson-practice.js",
  "./js/srs-engine.js",
  "./js/offline-db.js",
  "./js/sync-queue.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Cache each core asset individually so one missing file never aborts SW install
      await Promise.allSettled(
        CORE_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache' }).then((res) => {
            if (res.ok) return cache.put(url, res);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. NEVER intercept external APIs, Supabase Auth/Functions, or OAuth callback
  if (
    url.origin !== self.location.origin ||
    url.pathname.endsWith('/auth-callback.html') ||
    url.pathname.endsWith('/auth.html') ||
    url.searchParams.has('code') ||
    url.searchParams.has('access_token')
  ) {
    return;
  }

  // 2. Stale-While-Revalidate for JSON curriculum data & i18n
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // 3. Network-First for HTML navigations with offline.html fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  // 4. Cache-First for immutable fonts/images/icons, Stale-While-Revalidate for CSS/JS
  const isImmutable = /\.(woff2?|webp|png|jpg|svg|mp3|ogg)$/i.test(url.pathname);
  if (isImmutable) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
