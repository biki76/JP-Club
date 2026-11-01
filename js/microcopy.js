// qwen: microcopy — apply Task 2 D wording map at runtime
(function () {
  fetch('content/microcopy.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (pairs) {
    if (!Array.isArray(pairs)) return;
    function apply() {
      document.querySelectorAll('[data-en]').forEach(function (el) {
        var en = el.getAttribute('data-en');
        for (var i = 0; i < pairs.length; i++) {
          var p = pairs[i];
          if (en !== p.old) continue;
          el.setAttribute('data-en', p.en);
          if (p.bn) el.setAttribute('data-bn', p.bn);
          if (el.children.length === 0) {
            var bn = (document.documentElement.lang || '').indexOf('bn') === 0;
            el.textContent = bn && p.bn ? p.bn : p.en;
          }
        }
      });
    }
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }).catch(function () {});
})();
