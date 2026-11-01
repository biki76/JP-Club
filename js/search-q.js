// qwen: search-q — prefill + run search from ?q= deep link
(function () {
  var m = location.search.match(/[?&]q=([^&]+)/);
  if (!m) return;
  var q = decodeURIComponent(m[1].replace(/\+/g, ' '));
  function fill() {
    var input = document.querySelector('input[type="search"], input[name="q"], #search-input, .search-input');
    if (!input) return;
    input.value = q;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();
