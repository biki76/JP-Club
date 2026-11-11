/**
 * Singleton Accessibility Hooks (Prevents duplicate keydown listeners & skip links)
 */
(function (global) {
  'use strict';
  if (global.__JP_A11Y_HOOKS_BOUND__) return;
  global.__JP_A11Y_HOOKS_BOUND__ = true;

  function ensureSkipLink() {
    if (!document.body || document.querySelector('.skip-to-main, .skip-link')) return;
    const main = document.querySelector('main') || document.getElementById('main-content');
    if (!main) return;
    if (!main.id) main.id = 'main-content';

    const skip = document.createElement('a');
    skip.href = `#${main.id}`;
    skip.className = 'skip-link sr-only focus:not-sr-only';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.is-open, [role="dialog"]:not([hidden])');
      if (openModal) {
        const closeBtn = openModal.querySelector('[data-close], .modal-close, .close-btn');
        if (closeBtn) closeBtn.click();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureSkipLink, { once: true });
  } else {
    ensureSkipLink();
  }
})(typeof window !== 'undefined' ? window : globalThis);
