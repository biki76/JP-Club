/* Phase 0 — EN | বাং toggle. Swaps data-en / data-bn on every leaf. */
(function () {
  'use strict';

  var LANG_KEY = 'nihongo_lang';

  function get() { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } }

  function apply(lang) {
    var l = lang === 'bn' ? 'bn' : 'en';
    document.documentElement.setAttribute('lang', l);

    document.querySelectorAll('[data-en]').forEach(function (el) {
      var v = el.getAttribute(l === 'bn' ? 'data-bn' : 'data-en');
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-aria-label-en]').forEach(function (el) {
      var v = el.getAttribute(l === 'bn' ? 'data-aria-label-bn' : 'data-aria-label-en');
      if (v != null) el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(function (el) {
      var v = el.getAttribute(l === 'bn' ? 'data-placeholder-bn' : 'data-placeholder-en');
      if (v != null) el.setAttribute('placeholder', v);
    });

    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === l));
    });

    document.dispatchEvent(new CustomEvent('shell:langchange', { detail: { lang: l } }));
  }

  function set(lang) {
    var l = lang === 'bn' ? 'bn' : 'en';
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    apply(l);
  }

  window.I18n = { get: get, set: set, apply: apply };

  apply(get());

  window.addEventListener('storage', function (e) {
    if (e.key === LANG_KEY) apply(e.newValue || 'en');
  });
})();
