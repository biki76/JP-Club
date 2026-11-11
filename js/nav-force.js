/**
 * Idempotent Navigation Link Normalizer (No continuous MutationObserver thrashing)
 */
(function () {
  'use strict';

  function normalizeNavLinks() {
    const currentPage = (window.location.pathname.split('/').pop() || 'home.html').toLowerCase();
    const links = document.querySelectorAll('nav a[href], .bottom-nav a[href], .sidebar-nav a[href]');

    links.forEach((a) => {
      const rawHref = a.getAttribute('href') || '';
      if (rawHref.startsWith('http') || rawHref.startsWith('#')) return;

      // Ensure relative ./ path for GitHub Pages /JP-Club/ subpath compatibility
      if (rawHref.startsWith('/') && !rawHref.startsWith('/JP-Club/')) {
        a.setAttribute('href', '.' + rawHref);
      }

      const targetPage = rawHref.replace(/^(\.\/|\/)+/, '').split(/[?#]/)[0].toLowerCase();
      if (targetPage && targetPage === currentPage) {
        a.classList.add('active', 'is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeNavLinks, { once: true });
  } else {
    normalizeNavLinks();
  }
})();
