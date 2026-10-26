/* Phase 0 — theme + furigana toggles. State root: <html data-theme data-furigana>. */
(function () {
  'use strict';

  var THEME_KEY = 'nihongo_theme';
  var FURI_KEY = 'nihongo_furigana';
  var root = document.documentElement;

  function get(k, fb) { try { return localStorage.getItem(k) || fb; } catch (e) { return fb; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function applyTheme(t) {
    root.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  }
  function applyFurigana(f) {
    root.setAttribute('data-furigana', f === 'off' ? 'off' : 'on');
  }

  window.Theme = {
    get: function () { return get(THEME_KEY, 'light'); },
    set: function (t) { set(THEME_KEY, t); applyTheme(t); syncButtons(); },
    toggle: function () { window.Theme.set(window.Theme.get() === 'dark' ? 'light' : 'dark'); },
    getFurigana: function () { return get(FURI_KEY, 'on'); },
    setFurigana: function (f) { set(FURI_KEY, f); applyFurigana(f); syncButtons(); },
    toggleFurigana: function () { window.Theme.setFurigana(window.Theme.getFurigana() === 'on' ? 'off' : 'on'); }
  };

  function syncButtons() {
    var dark = window.Theme.get() === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('data-en', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('data-bn', dark ? 'লাইট মোডে যান' : 'ডার্ক মোডে যান');
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
    var furiOn = window.Theme.getFurigana() === 'on';
    document.querySelectorAll('[data-furigana-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(furiOn));
    });
  }

  applyTheme(get(THEME_KEY, 'light'));
  applyFurigana(get(FURI_KEY, 'on'));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncButtons);
  } else { syncButtons(); }

  // Cross-tab sync
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY) { applyTheme(e.newValue || 'light'); syncButtons(); }
    if (e.key === FURI_KEY) { applyFurigana(e.newValue || 'on'); syncButtons(); }
  });
})();
