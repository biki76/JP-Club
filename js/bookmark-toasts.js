// qwen: bookmark-toasts — toast after bookmark toggle, in current language
(function () {
  document.addEventListener('click', function (e) {
    if (typeof window.showToast !== 'function') return;
    var b = e.target.closest ? e.target.closest('[data-bookmark], .bookmark-btn, button[aria-label*="ookmark"], [aria-label*="বুকমার্ক"]') : null;
    if (!b) return;
    setTimeout(function () {
      var on = b.getAttribute('aria-pressed') === 'true' || b.classList.contains('active') || b.classList.contains('bookmarked');
      var bn = (document.documentElement.lang || '').indexOf('bn') === 0;
      window.showToast(on ? (bn ? 'বুকমার্ক যোগ হয়েছে' : 'Bookmark added') : (bn ? 'বুকমার্ক সরানো হয়েছে' : 'Bookmark removed'), 'success');
    }, 0);
  });
})();
