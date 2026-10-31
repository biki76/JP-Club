(function () {
  'use strict';
  var lang = function () { return document.documentElement.lang === 'bn' ? 'bn' : 'en'; };

  function fixCanvas(root) {
    root.querySelectorAll('canvas:not([role])').forEach(function (c) {
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', lang() === 'bn'
        ? 'কানজি লেখার অনুশীলন এলাকা'
        : 'Kanji writing practice area');
    });
    root.querySelectorAll('[class*="kanji"] svg:not([role]), [class*="stroke"] svg:not([role])').forEach(function (s) {
      s.setAttribute('role', 'img');
      if (!s.getAttribute('aria-label')) {
        s.setAttribute('aria-label', lang() === 'bn' ? 'কানজি স্ট্রোক অর্ডার ডায়াগ্রাম' : 'Kanji stroke order diagram');
      }
    });
  }

  function fixBadges(root) {
    root.querySelectorAll('[class*="badge"], [class*="result"], [class*="feedback"]').forEach(function (b) {
      if (b.dataset.a11yBadge) return;
      var c = b.className.toString().toLowerCase();
      var kind = /incorrect|wrong/.test(c) ? 'wrong' : (/correct|right/.test(c) ? 'ok' : '');
      if (!kind) return;
      b.dataset.a11yBadge = kind;
      var s = document.createElement('span');
      s.className = 'sr-only';
      s.innerHTML = kind === 'ok'
        ? '<span data-en="Correct: " data-bn="সঠিক: ">' + (lang() === 'bn' ? 'সঠিক: ' : 'Correct: ') + '</span>'
        : '<span data-en="Incorrect: " data-bn="ভুল: ">' + (lang() === 'bn' ? 'ভুল: ' : 'Incorrect: ') + '</span>';
      b.insertBefore(s, b.firstChild);
    });
  }

  function run(root) { fixCanvas(root); fixBadges(root); }
  run(document);
  var t;
  new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(function () { run(document); }, 80);
  }).observe(document.body, { childList: true, subtree: true });

  // expose reduced-motion for page scripts
  window.NIHONGO_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
})();
