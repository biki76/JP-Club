/* Phase 2 — layout shell. Renders header, sidebar, bottom nav, footer, drawer.
 * Config via window.SHELL_CONFIG (set before this file loads).
 * Events: shell:search (detail.q) · shell:langchange (detail.lang)
 */
(function () {
  'use strict';

  var ICONS = {
    menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-3a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20z"/></svg>',
    kanji: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="15" x2="16" y2="15"/></svg>',
    practice: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>'
  };

  var DEFAULT_CONFIG = {
    navGroups: [
      { title: { en: 'Learn', bn: 'শিখুন' }, items: [
        { key: 'home', icon: 'home', href: 'home.html', label: { en: 'Home', bn: 'হোম' } },
        { key: 'lesson', icon: 'book', href: 'lesson.html?lesson=minna-001', label: { en: 'Lessons', bn: 'পাঠ' } },
        { key: 'flashcards', icon: 'practice', href: 'flashcards.html', label: { en: 'Flashcards', bn: 'ফ্ল্যাশকার্ড' } },
        { key: 'quiz', icon: 'practice', href: 'quiz.html', label: { en: 'Quiz', bn: 'কুইজ' } },
        { key: 'kanji', icon: 'kanji', href: 'kanji.html', label: { en: 'Kanji', bn: 'কাঞ্জি' } }
      ]},
      { title: { en: 'Explore', bn: 'অন্বেষণ' }, items: [
        { key: 'search', icon: 'search', href: 'search.html', label: { en: 'Search', bn: 'অনুসন্ধান' } },
        { key: 'progress', icon: 'practice', href: 'progress.html', label: { en: 'Progress', bn: 'অগ্রগতি' } },
        { key: 'placement', icon: 'book', href: 'placement.html', label: { en: 'Placement', bn: 'প্লেসমেন্ট' } }
      ]}
    ],
    bottomNav: [
      { href: 'home.html', icon: 'home', label: { en: 'Home', bn: 'হোম' } },
      { href: 'flashcards.html', icon: 'practice', label: { en: 'Cards', bn: 'কার্ড' } },
      { href: 'search.html', icon: 'search', label: { en: 'Search', bn: 'অনুসন্ধান' } },
      { href: 'progress.html', icon: 'practice', label: { en: 'Progress', bn: 'অগ্রগতি' } }
    ],
    searchEnabled: true
  };

  var cfg = Object.assign({}, DEFAULT_CONFIG, window.SHELL_CONFIG || {});

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function txt(o) {
    return '<span data-en="' + esc(o.en) + '" data-bn="' + esc(o.bn) + '">' + esc(o.en) + '</span>';
  }
  function currentPage() {
    var p = location.pathname.split('/').pop() || 'home.html';
    return p || 'home.html';
  }
  function isCurrent(href) {
    return href.split('?')[0] === currentPage();
  }

  /* ---------- header ---------- */
  function renderHeader(host) {
    var html = '';
    html += '<button class="ctrl shell-header__menu" type="button" data-drawer-open '
      + 'data-aria-label-en="Open menu" data-aria-label-bn="মেনু খুলুন" aria-label="Open menu">' + ICONS.menu + '</button>';
    html += '<a class="shell-header__brand" href="home.html">'
      + '<span class="shell-header__mark" aria-hidden="true">日</span>'
      + '<span>Nihongo · Bengali</span></a>';
    html += '<span class="shell-header__spacer"></span>';

    if (cfg.searchEnabled) {
      html += '<form class="shell-search" role="search" data-shell-search>'
        + ICONS.search
        + '<input type="search" name="q" autocomplete="off" spellcheck="false" '
        + 'data-placeholder-en="Search lessons, words, kanji…" data-placeholder-bn="পাঠ, শব্দ, কাঞ্জি খুঁজুন…" '
        + 'placeholder="Search lessons, words, kanji…" '
        + 'data-aria-label-en="Search" data-aria-label-bn="অনুসন্ধান" aria-label="Search" />'
        + '</form>';
    }

    html += '<div class="shell-header__actions">';
    html += '<div class="lang-toggle" role="group" data-aria-label-en="Language" data-aria-label-bn="ভাষা" aria-label="Language">'
      + '<button type="button" data-lang-btn="en" aria-pressed="true">EN</button>'
      + '<button type="button" data-lang-btn="bn" aria-pressed="false">বাং</button></div>';
    html += '<button class="ctrl ctrl--desktop" type="button" data-furigana-toggle aria-pressed="true" '
      + 'data-aria-label-en="Toggle furigana" data-aria-label-bn="ফুরিগানা চালু/বন্ধ" aria-label="Toggle furigana">'
      + '<span style="font-family:var(--font-jp);font-weight:700">あ</span></button>';
    html += '<button class="ctrl" type="button" data-theme-toggle aria-pressed="false" '
      + 'data-aria-label-en="Switch to dark mode" data-aria-label-bn="ডার্ক মোডে যান" aria-label="Switch to dark mode">'
      + ICONS.moon + '</button>';
    html += '</div>';

    host.className = 'shell-header';
    host.innerHTML = html;

    host.querySelector('[data-drawer-open]').addEventListener('click', function () { openDrawer(true); });
    host.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.addEventListener('click', function () { window.I18n && window.I18n.set(b.getAttribute('data-lang-btn')); });
    });
    host.querySelector('[data-theme-toggle]').addEventListener('click', function () {
      window.Theme && window.Theme.toggle();
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.innerHTML = dark ? ICONS.sun : ICONS.moon;
    });
    var furi = host.querySelector('[data-furigana-toggle]');
    if (furi) furi.addEventListener('click', function () { window.Theme && window.Theme.toggleFurigana(); });

    var form = host.querySelector('[data-shell-search]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = form.querySelector('input').value.trim();
        document.dispatchEvent(new CustomEvent('shell:search', { detail: { q: q } }));
        if (!q) return;
        if (currentPage() !== 'search.html') {
          location.href = 'search.html?q=' + encodeURIComponent(q);
        }
      });
    }
  }

  /* ---------- nav ---------- */
  function navHTML() {
    return cfg.navGroups.map(function (g) {
      return '<div class="shell-nav__group">'
        + '<div class="shell-nav__title">' + txt(g.title) + '</div>'
        + g.items.map(function (it) {
            return '<a class="shell-nav__item" href="' + esc(it.href) + '"'
              + (isCurrent(it.href) ? ' aria-current="page"' : '') + '>'
              + '<span class="shell-nav__icon" aria-hidden="true">' + (ICONS[it.icon] || '') + '</span>'
              + txt(it.label) + '</a>';
          }).join('')
        + '</div>';
    }).join('');
  }

  function renderSidebar(host) {
    host.innerHTML = navHTML();
  }

  function renderBottomNav(host) {
    host.innerHTML = cfg.bottomNav.map(function (it) {
      return '<a href="' + esc(it.href) + '"' + (isCurrent(it.href) ? ' aria-current="page"' : '') + '>'
        + '<span aria-hidden="true">' + (ICONS[it.icon] || '') + '</span>'
        + txt(it.label) + '</a>';
    }).join('');
  }

function renderFooter(host) {
    host.innerHTML = '<div class="shell-footer__inner">'
      + '<div>'
      + '<span>' + txt({ en: '© JP-Club — Japanese for Bengali speakers', bn: '© JP-Club — বাংলাভাষীদের জন্য জাপানিজ' }) + '</span>'
      + '<span style="display:block; margin-top:4px; font-size:11px;">' + txt({ en: 'JLPT N5–N3', bn: 'JLPT N5–N3' }) + '</span>'
      + '</div>'
      + '<div class="shell-footer__nihonsync">'
      + '<a href="https://biki76.github.io/NihonSync/" target="_blank" rel="noopener" class="nihonsync-badge" aria-label="Download the NihonSync app for JLPT N5">'
      + '<span class="nihonsync-text">'
      + '<span class="nihonsync-label">Free Android App · N5</span>'
      + '<span class="nihonsync-name">🎌 Download NihonSync</span>'
      + '</span>'
      + '</a>'
      + '</div>'
      + '</div>';
  }0

  /* ---------- drawer ---------- */
  var lastFocus = null;

  function openDrawer(open) {
    var drawer = document.querySelector('[data-shell-drawer]');
    var scrim = document.querySelector('.shell-scrim');
    if (!drawer) return;
    drawer.setAttribute('data-open', String(!!open));
    if (scrim) scrim.setAttribute('data-open', String(!!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      lastFocus = document.activeElement;
      var first = drawer.querySelector('a, button');
      if (first) first.focus();
    } else if (lastFocus) {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  function renderDrawer(host) {
    host.innerHTML = '<div class="shell-drawer__head">'
      + '<strong>' + txt({ en: 'Menu', bn: 'মেনু' }) + '</strong>'
      + '<button class="ctrl" type="button" data-drawer-close '
      + 'data-aria-label-en="Close menu" data-aria-label-bn="মেনু বন্ধ করুন" aria-label="Close menu">'
      + ICONS.close + '</button></div>' + navHTML();

    host.querySelector('[data-drawer-close]').addEventListener('click', function () { openDrawer(false); });

    // scrim
    var scrim = document.createElement('div');
    scrim.className = 'shell-scrim';
    scrim.setAttribute('data-open', 'false');
    scrim.addEventListener('click', function () { openDrawer(false); });
    document.body.appendChild(scrim);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && host.getAttribute('data-open') === 'true') openDrawer(false);
      if (e.key !== 'Tab' || host.getAttribute('data-open') !== 'true') return;
      var f = host.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- boot ---------- */
  function init() {
    var header = document.querySelector('[data-shell-header]');
    var sidebar = document.querySelector('[data-shell-sidebar]');
    var bottom = document.querySelector('[data-shell-bottomnav]');
    var footer = document.querySelector('[data-shell-footer]');
    var drawer = document.querySelector('[data-shell-drawer]');

    if (header) renderHeader(header);
    if (sidebar) renderSidebar(sidebar);
    if (bottom) renderBottomNav(bottom);
    if (footer) renderFooter(footer);
    if (drawer) renderDrawer(drawer);

    if (window.I18n) window.I18n.apply(window.I18n.get());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
