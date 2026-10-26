/* Phase 0 — misc wiring: smooth anchor focus, external link hardening. */
(function () {
  'use strict';

  // Keep keyboard focus visible after in-page navigation.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 0);
  });

  // Harden target=_blank links.
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    a.setAttribute('rel', (a.getAttribute('rel') || '') + ' noopener noreferrer');
  });
})();
