/* Phase 11 — PWA runtime. Service worker registration + install/update banners. */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var deferredPrompt = null, registration = null;
  var installBanner = null, updateBanner = null;
  var dismissed = { install: false, update: false };

  function txt(en, bn) {
    return '<span data-en="' + en + '" data-bn="' + bn + '">' + en + '</span>';
  }

  function container() {
    var el = document.getElementById('pwa-banners');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'pwa-banners';
    el.className = 'pwa-banners';
    document.body.appendChild(el);
    return el;
  }

  function buildInstall() {
    var el = document.createElement('div');
    el.className = 'pwa-banner pwa-banner--install';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'pwa-install-title');
    el.innerHTML =
      '<div class="pwa-banner__icon" aria-hidden="true">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="5" y="2" width="14" height="20" rx="2"/>' +
          '<line x1="12" y1="18" x2="12" y2="18"/>' +
        '</svg>' +
      '</div>' +
      '<div class="pwa-banner__body">' +
        '<div class="pwa-banner__title" id="pwa-install-title">' +
          txt('Install for offline study', 'অফলাইন পড়াশোনার জন্য ইনস্টল করুন') +
        '</div>' +
        '<div class="pwa-banner__desc">' +
          txt('Add to your home screen to use lessons without internet.', 'ইন্টারনেট ছাড়াই পাঠ ব্যবহার করতে হোম স্ক্রিনে যোগ করুন।') +
        '</div>' +
      '</div>' +
      '<div class="pwa-banner__actions">' +
        '<button class="btn btn--ghost btn--sm" type="button" data-pwa-dismiss>' + txt('Not now', 'এখন নয়') + '</button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pwa-install>' + txt('Install', 'ইনস্টল') + '</button>' +
      '</div>';
    return el;
  }

  function buildUpdate() {
    var el = document.createElement('div');
    el.className = 'pwa-banner pwa-banner--update';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="pwa-banner__icon" aria-hidden="true">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 12a9 9 0 1 1-3-6.7"/>' +
          '<polyline points="21 3 21 9 15 9"/>' +
        '</svg>' +
      '</div>' +
      '<div class="pwa-banner__body">' +
        '<div class="pwa-banner__title">' + txt('A new version is available', 'নতুন সংস্করণ উপলব্ধ') + '</div>' +
        '<div class="pwa-banner__desc">' + txt('Reload to get the latest lessons and fixes.', 'সর্বশেষ পাঠ ও সংশোধন পেতে রিলোড করুন।') + '</div>' +
      '</div>' +
      '<div class="pwa-banner__actions">' +
        '<button class="btn btn--ghost btn--sm" type="button" data-pwa-dismiss>' + txt('Later', 'পরে') + '</button>' +
        '<button class="btn btn--primary btn--sm" type="button" data-pwa-update>' + txt('Reload', 'রিলোড') + '</button>' +
      '</div>';
    return el;
  }

  function mountInstall() {
    if (dismissed.install || installBanner) return;
    installBanner = buildInstall();
    container().appendChild(installBanner);
    installBanner.querySelector('[data-pwa-dismiss]').addEventListener('click', function () {
      dismissed.install = true;
      unmount(installBanner);
    });
    installBanner.querySelector('[data-pwa-install]').addEventListener('click', async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) {}
      deferredPrompt = null;
      unmount(installBanner);
    });
  }

  function mountUpdate() {
    if (dismissed.update || updateBanner) return;
    updateBanner = buildUpdate();
    container().appendChild(updateBanner);
    updateBanner.querySelector('[data-pwa-dismiss]').addEventListener('click', function () {
      dismissed.update = true;
      unmount(updateBanner);
    });
    updateBanner.querySelector('[data-pwa-update]').addEventListener('click', function () {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }

  function unmount(el) {
    if (!el || !el.parentNode) return;
    el.parentNode.removeChild(el);
    if (el === installBanner) installBanner = null;
    if (el === updateBanner) updateBanner = null;
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    mountInstall();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    unmount(installBanner);
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then(function (reg) {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) mountUpdate();
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) mountUpdate();
          });
        });
      })
      .catch(function (err) { console.warn('[pwa] SW registration failed', err); });
  });

  var reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.__PWA__ = {
    isInstallable: function () { return !!deferredPrompt; },
    forceUpdate: function () {
      if (registration && registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };
})();
