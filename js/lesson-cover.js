(function () {
  'use strict';
  var slug = new URLSearchParams(location.search).get('lesson');
  if (!slug) return;
  var src = 'images/lessons/' + slug + '.webp';
  var state = 'unknown'; // unknown | loading | ok | none
  function mk(cls) {
    var i = document.createElement('img');
    i.className = cls; i.src = src; i.alt = ''; i.setAttribute('aria-hidden', 'true');
    i.width = 400; i.height = 240; i.decoding = 'async';
    return i;
  }
  function place() {
    var h = document.querySelector('main h1');
    if (h && !document.querySelector('.lesson-cover')) h.parentNode.insertBefore(mk('lesson-cover'), h);
    document.querySelectorAll('[role="tabpanel"]').forEach(function (p) {
      var key = ((p.id || '') + ' ' + (p.getAttribute('aria-labelledby') || '') + ' ' + (p.getAttribute('data-panel') || '')).toLowerCase();
      if (/listening|practice/.test(key) && !p.querySelector(':scope > .lesson-cover-sm')) p.insertBefore(mk('lesson-cover-sm'), p.firstChild);
    });
  }
  function run() {
    if (state === 'none' || state === 'loading') return;
    if (state === 'ok') { place(); return; }
    state = 'loading';
    var probe = new Image();
    probe.onload = function () { state = 'ok'; place(); };
    probe.onerror = function () { state = 'none'; };
    probe.src = src;
  }
  run();
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 120); }).observe(document.body, { childList: true, subtree: true });
})();
