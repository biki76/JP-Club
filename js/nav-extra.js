(function () {
  'use strict';
  var SLOTS = '[data-shell-sidebar],[data-shell-bottomnav],[data-shell-drawer],[data-shell-header]';

  function inject() {
    document.querySelectorAll(SLOTS).forEach(function (slot) {
      if (slot.querySelector('a[href^="lessons.html"]')) return;
      var ref = slot.querySelector('a[href^="flashcards.html"]');
      if (!ref) return;
      var a = ref.cloneNode(true);
      a.setAttribute('href', 'lessons.html');
      a.removeAttribute('aria-current');
      a.classList.remove('is-active', 'active');
      var en = 'Lessons', bn = 'পাঠসমূহ';
      var leaves = a.querySelectorAll('[data-en]');
      if (leaves.length) {
        leaves.forEach(function (n, i) {
          if (i === leaves.length - 1) {
            n.setAttribute('data-en', en);
            n.setAttribute('data-bn', bn);
            n.textContent = document.documentElement.lang === 'bn' ? bn : en;
          }
        });
      } else {
        var lbl = document.createElement('span');
        lbl.setAttribute('data-en', en);
        lbl.setAttribute('data-bn', bn);
        lbl.textContent = document.documentElement.lang === 'bn' ? bn : en;
        a.textContent = '';
        a.appendChild(lbl);
      }
      if (location.pathname.split('/').pop() === 'lessons.html') a.setAttribute('aria-current', 'page');
      ref.parentNode.insertBefore(a, ref);
    });
  }

  inject();
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(inject, 60); })
    .observe(document.body, { childList: true, subtree: true });
})();
