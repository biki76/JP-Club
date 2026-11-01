(function () {
  'use strict';
  var host;
  function isBn() { return (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn'; }
  function ensure() {
    if (host) return host;
    host = document.createElement('div');
    host.className = 'v2-toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
    return host;
  }
  function show(en, bn, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'v2-toast v2-toast--' + (opts.type || 'info');
    var icon = { ok: '\u2713', err: '!', info: 'i' }[opts.type || 'info'];
    var i = document.createElement('span');
    i.className = 'v2-toast__icon'; i.setAttribute('aria-hidden', 'true'); i.textContent = icon;
    var s = document.createElement('span');
    s.setAttribute('data-en', en); s.setAttribute('data-bn', bn); s.textContent = isBn() ? bn : en;
    el.appendChild(i); el.appendChild(s);
    ensure().appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, opts.ms || 3800);
  }
  window.Toast = { show: show };
  window.addEventListener('offline', function () {
    show("You're offline. Your progress is saved and will sync later.", 'আপনি অফলাইনে। অগ্রগতি সংরক্ষিত আছে, পরে সিঙ্ক হবে।', { type: 'info', ms: 5000 });
  });
  window.addEventListener('online', function () {
    show('Back online.', 'আবার অনলাইনে।', { type: 'ok' });
  });
})();
