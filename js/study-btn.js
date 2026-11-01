(function () {
  'use strict';
  function isBn() { return (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn'; }
  function apply() {
    document.querySelectorAll('[data-shell-bottomnav] a[href^="flashcards.html"]').forEach(function (a) {
      a.classList.add('is-study');
      var leaves = a.querySelectorAll('[data-en]');
      var el = leaves.length ? leaves[leaves.length - 1] : null;
      if (el && el.getAttribute('data-en') !== 'Study') {
        el.setAttribute('data-en', 'Study');
        el.setAttribute('data-bn', 'পড়ুন');
        el.textContent = isBn() ? 'পড়ুন' : 'Study';
      }
      a.setAttribute('aria-label', isBn() ? 'পড়ুন: ফ্ল্যাশকার্ড' : 'Study: flashcards');
    });
  }
  apply();
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(apply, 60); })
    .observe(document.body, { childList: true, subtree: true });
})();
