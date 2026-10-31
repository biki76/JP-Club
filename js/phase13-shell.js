// Phase 13b — mobile header declutter + drawer labels (FIXED v4)
(function () {
  'use strict';
  var MQ = window.matchMedia('(max-width: 767px)');
  var homes = { lang: null, theme: null };
  var initialized = false;

  function header() { return document.querySelector('[data-shell-header]'); }
  function drawer() { return document.querySelector('[data-shell-drawer]'); }
  
  function pickLang(h) {
    if (!h) return null;
    var marked = h.querySelector('[data-p13="lang"]');
    if (marked) return marked;
    
    // Look for the language toggle group (contains both EN and বাং)
    var groups = h.querySelectorAll('[role="group"], [class*="lang"], [class*="toggle"]');
    for (var i = 0; i < groups.length; i++) {
      var t = groups[i].textContent || '';
      if (/বাং/.test(t) && /EN/i.test(t)) return groups[i];
    }
    
    return null;
  }
  
  function pickTheme(h) {
    if (!h) return null;
    var marked = h.querySelector('[data-p13="theme"]');
    if (marked) return marked;
    
    // Strategy 1: Look for button with theme-related aria-label
    var buttons = h.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var label = (buttons[i].getAttribute('aria-label') || '').toLowerCase();
      if (/theme|dark|light|অন্ধকার|থিম|মোড/.test(label)) return buttons[i];
    }
    
    // Strategy 2: Look for button with theme-related class
    var themeBtn = h.querySelector('button[class*="theme"], button[class*="dark"]');
    if (themeBtn) return themeBtn;
    
    // Strategy 3: Look for button that toggles data-theme attribute
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].hasAttribute('data-theme-toggle')) return buttons[i];
    }
    
    return null;
  }

  function ensureSettingsBox(d) {
    if (!d) return null;
    var box = d.querySelector('.p13-settings');
    if (!box) {
      box = document.createElement('div');
      box.className = 'p13-settings';
      box.innerHTML = '<h3 style="margin:0 0 1rem 0;font-size:0.75rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--ink-subtle);"><span data-en="Settings" data-bn="সেটিংস">Settings</span></h3>';
      d.appendChild(box);
    }
    return box;
  }

  function applyLang() {
    var lang = localStorage.getItem('nihongo_lang') || 'en';
    document.querySelectorAll('.p13-settings [data-en]').forEach(function (s) {
      s.textContent = (lang === 'bn' ? s.dataset.bn : s.dataset.en) || s.dataset.en;
    });
  }

  function place() {
    var h = header();
    var d = drawer();
    
    if (!h || !d) return;
    
    var lang = pickLang(h);
    var theme = pickTheme(h);
    
    console.log('[Phase13] Found lang:', lang ? 'YES' : 'NO');
    console.log('[Phase13] Found theme:', theme ? 'YES' : 'NO');
    
    var box = ensureSettingsBox(d);
    
    // Clear old settings content (except title)
    var oldRows = box.querySelectorAll('.p13-setting-row');
    oldRows.forEach(function(el){ el.remove(); });

    if (MQ.matches) {
      // --- MOBILE: Move to drawer with labels ---
      if (lang) {
        lang.dataset.p13 = 'lang';
        var row = document.createElement('div');
        row.className = 'p13-setting-row';
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;';
        var label = document.createElement('span');
        label.className = 'p13-label';
        label.setAttribute('data-en', 'Language');
        label.setAttribute('data-bn', 'ভাষা');
        label.textContent = 'Language';
        label.style.cssText = 'font-size:0.875rem;font-weight:500;color:var(--ink);';
        row.appendChild(label);
        row.appendChild(lang);
        box.appendChild(row);
      }
      if (theme) {
        theme.dataset.p13 = 'theme';
        var row2 = document.createElement('div');
        row2.className = 'p13-setting-row';
        row2.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
        var label2 = document.createElement('span');
        label2.className = 'p13-label';
        label2.setAttribute('data-en', 'Appearance');
        label2.setAttribute('data-bn', 'রূপ');
        label2.textContent = 'Appearance';
        label2.style.cssText = 'font-size:0.875rem;font-weight:500;color:var(--ink);';
        row2.appendChild(label2);
        row2.appendChild(theme);
        box.appendChild(row2);
      }
    } else {
      // --- DESKTOP: Move back to header ---
      [ [lang, homes.lang], [theme, homes.theme] ].forEach(function (pair) {
        var el = pair[0], home = pair[1];
        if (el && home && home.parent && el.parentNode !== home.parent) {
            home.parent.insertBefore(el, home.next);
        }
      });
    }
    applyLang();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    
    place();
    
    var d = drawer();
    if (d) {
      new MutationObserver(function () {
        if (MQ.matches) {
          var box = d.querySelector('.p13-settings');
          if (!box || !box.querySelector('.p13-setting-row')) {
            place();
          }
        }
      }).observe(d, { childList: true, subtree: true });
    }
    
    if (MQ.addEventListener) MQ.addEventListener('change', place);
    
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-p13="lang"]')) {
        setTimeout(applyLang, 0);
      }
    }, true);
    
    requestAnimationFrame(place);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();
