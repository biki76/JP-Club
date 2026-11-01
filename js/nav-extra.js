(function () {
  'use strict';
  var SLOTS = '[data-shell-sidebar],[data-shell-bottomnav],[data-shell-drawer],[data-shell-header]';

  function inject() {
    document.querySelectorAll(SLOTS).forEach(function (slot) {
      var old = slot.querySelector('a[href^="lesson.html"]'); /* repoint */
      if (old) { old.setAttribute('href', 'lessons.html'); if (location.pathname.split('/').pop() === 'lessons.html') old.setAttribute('aria-current', 'page'); return; }
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
            n.textContent = (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn' ? bn : en;
          }
        });
      } else {
        var lbl = document.createElement('span');
        lbl.setAttribute('data-en', en);
        lbl.setAttribute('data-bn', bn);
        lbl.textContent = (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn' ? bn : en;
        a.textContent = '';
        a.appendChild(lbl);
      }
      var sv = a.querySelector('svg'); if (sv) { sv.setAttribute('viewBox', '0 0 24 24'); sv.innerHTML = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'; }
      if (location.pathname.split('/').pop() === 'lessons.html') a.setAttribute('aria-current', 'page');
      ref.parentNode.insertBefore(a, ref);
    });
  }

  inject();
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(inject, 60); })
    .observe(document.body, { childList: true, subtree: true });
})();
