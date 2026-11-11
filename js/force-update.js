/**
 * Safe Service Worker Update Handler (Prevents infinite reload loops on mobile)
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  const RELOAD_GUARD_KEY = 'jp_club_sw_reload_ts';
  const MIN_RELOAD_INTERVAL_MS = 30000;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    const now = Date.now();
    if (now - lastReload < MIN_RELOAD_INTERVAL_MS) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  });
})();
