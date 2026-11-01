(function () {
  'use strict';
  var slug = new URLSearchParams(location.search).get('lesson');
  if (!slug) return;
  var src = 'images/lessons/' + slug + '.svg';
  function mk(cls) {
    var i = document.createElement('img');
    i.className = cls; i.src = src; i.alt = ''; i.setAttribute('aria-hidden', 'true');
    i.width = 400; i.height = 240; i.decoding = 'async';
    return i;
  }
  function run() {
    var h = document.querySelector('main h1');
    if (h && !document.querySelector('.lesson-cover')) h.parentNode.insertBefore(mk('lesson-cover'), h);
    document.querySelectorAll('[role="tabpanel"]').forEach(function (p) {
      var key = ((p.id || '') + ' ' + (p.getAttribute('aria-labelledby') || '') + ' ' + (p.getAttribute('data-panel') || '')).toLowerCase();
      if (/listening|practice/.test(key) && !p.querySelector(':scope > .lesson-cover-sm')) p.insertBefore(mk('lesson-cover-sm'), p.firstChild);
    });
  }
  run();
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 80); }).observe(document.body, { childList: true, subtree: true });
})();
