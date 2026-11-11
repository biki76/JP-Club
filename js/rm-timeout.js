/**
 * Fail-safe skeleton/loader cleanup without continuous DOM polling
 */
(function () {
  'use strict';

  function clearStuckLoaders() {
    const loaders = document.querySelectorAll('.is-loading, .skeleton-loader, [data-loading="true"]');
    loaders.forEach((el) => {
      el.classList.remove('is-loading', 'skeleton-loader');
      el.removeAttribute('data-loading');
      el.setAttribute('aria-busy', 'false');
    });
  }

  // Run once after initial load + 4.5s timeout fallback, then stop completely
  if (document.readyState === 'complete') {
    setTimeout(clearStuckLoaders, 4500);
  } else {
    window.addEventListener('load', () => setTimeout(clearStuckLoaders, 4500), { once: true });
  }
})();
