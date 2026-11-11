/* Unified Bookmark Toast Listener */
(function () {
  'use strict';
  document.addEventListener('jp:bookmark-toggled', (e) => {
    const detail = (e && e.detail) || {};
    const msg = detail.added ? 'Saved to bookmarks' : 'Removed from bookmarks';
    if (typeof window.showToast === 'function') {
      window.showToast(msg, detail.added ? 'success' : 'info', 2200);
    }
  });
})();
