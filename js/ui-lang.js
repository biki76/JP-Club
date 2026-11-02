(function () {
  'use strict';
  var LANGS = [
    { c: 'en', b: 'EN', n: 'English', html: 'en' },
    { c: 'bn', b: 'BN', n: 'বাংলা', html: 'bn' },
    { c: 'vi', b: 'VI', n: 'Tiếng Việt', html: 'vi' },
    { c: 'zh', b: 'ZH', n: '中文', html: 'zh-Hans' },
    { c: 'id', b: 'ID', n: 'Bahasa Indonesia', html: 'id' },
    { c: 'ko', b: 'KO', n: '한국어', html: 'ko' },
    { c: 'fil', b: 'FIL', n: 'Filipino', html: 'fil' },
    { c: 'ne', b: 'NE', n: 'नेपाली', html: 'ne' },
    { c: 'hi', b: 'HI', n: 'हिन्दी', html: 'hi' },
    { c: 'ur', b: 'UR', n: 'اردو', html: 'ur' }
  ];
  function byCode(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].c === c) return LANGS[i]; return LANGS[0]; }
  function current() {
    var l = localStorage.getItem('nihongo_ui_lang');
    if (l && byCode(l).c === l) return l;
    return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en';
  }
  var cur = current(), dict = {}, menu = null, btn = null;

  function setLang(c) {
    try {
      localStorage.setItem('nihongo_ui_lang', c);
      localStorage.setItem('nihongo_lang', c === 'bn' ? 'bn' : 'en');
    } catch (e) {}
    location.reload();
  }

  /* ---------- translation of [data-en] text ---------- */
  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function translate() {
    var d = document.documentElement, L = byCode(cur);
    if (d.lang !== L.html) d.setAttribute('lang', L.html);
    d.setAttribute('data-ui-lang', cur);
    if (cur === 'ur') d.setAttribute('dir', 'rtl'); else d.removeAttribute('dir');
    if (cur === 'bn') return;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var t = dict[norm(el.getAttribute('data-en'))];
      if (t && el.textContent !== t) el.textContent = t;
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(function (el) {
      var t = dict[norm(el.getAttribute('data-placeholder-en'))];
      if (t && el.getAttribute('placeholder') !== t) el.setAttribute('placeholder', t);
    });
    document.querySelectorAll('[data-aria-label-en]').forEach(function (el) {
      var t = dict[norm(el.getAttribute('data-aria-label-en'))];
      if (t && el.getAttribute('aria-label') !== t) el.setAttribute('aria-label', t);
    });
  }

  /* ---------- switcher ---------- */
  function closeMenu(focus) {
    if (!menu) return;
    menu.hidden = true;
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); }
  }
  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var r = btn.getBoundingClientRect(), w = Math.min(280, window.innerWidth - 16);
    menu.style.width = w + 'px';
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    var left = cur === 'ur' ? r.right - w : r.left;
    menu.style.left = Math.max(8, Math.min(left, window.innerWidth - w - 8)) + 'px';
    var sel = menu.querySelector('[aria-checked="true"]'); if (sel) sel.focus();
  }
  function build() {
    if (document.querySelector('.ul-btn')) return;
    var header = document.querySelector('[data-shell-header]');
    if (!header) return;
    var L = byCode(cur);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ul-btn';
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Language: ' + L.n);
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg><span class="ul-code">' + L.b + '</span><span class="ul-caret" aria-hidden="true">\u25BE</span>';
    menu = document.createElement('div');
    menu.className = 'ul-menu'; menu.hidden = true; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Language');
    LANGS.forEach(function (x) {
      var i = document.createElement('button');
      i.type = 'button'; i.className = 'ul-item'; i.setAttribute('role', 'menuitemradio');
      i.setAttribute('aria-checked', x.c === cur ? 'true' : 'false');
      i.setAttribute('lang', x.html);
      i.innerHTML = '<span class="ul-badge">' + x.b + '</span><span class="ul-name">' + x.n + '</span>' + (x.c === cur ? '<span class="ul-tick" aria-hidden="true">\u2713</span>' : '');
      i.addEventListener('click', function () { if (x.c === cur) closeMenu(true); else setLang(x.c); });
      menu.appendChild(i);
    });
    // hide the old EN | বাং pill and take its place
    var old = null;
    header.querySelectorAll('button').forEach(function (b) {
      if (!old && b.textContent.trim() === 'বাং' && b.parentNode) old = b.parentNode;
    });
    if (old) { old.style.display = 'none'; old.parentNode.insertBefore(btn, old); }
    else header.appendChild(btn);
    document.body.appendChild(menu);
    btn.addEventListener('click', function () { if (menu.hidden) openMenu(); else closeMenu(false); });
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('.ul-item')), k = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(k + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(k - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu(false); });
    window.addEventListener('resize', function () { closeMenu(false); });
  }

  /* ---------- boot ---------- */
  function load() {
    if (cur === 'bn') { translate(); return Promise.resolve(); }
    return fetch('content/i18n/' + cur + '.json').then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { var s = (j && j.strings) || {}; Object.keys(s).forEach(function (k) { dict[norm(k)] = s[k]; }); })
      .catch(function () {});
  }
  function start() {
    build(); translate();
    var t;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { build(); translate(); }, 80); })
      .observe(document.body, { childList: true, subtree: true });
  }
  load().then(start);
})();
