/* js/lessons.js — Lessons catalog (renamed from js/lesson.js in Step 1).
   - Reads course manifests via DataLoader.loadCourse().
   - Renders 50 lesson cards (Book I 1–25, Book II 26–50).
   - Reads nihongo_progress from localStorage (local authority).
   - No Supabase calls — cloud sync happens in cloud.js only.
   - Filters (?filter=) and book scope (?book=) live in the URL.
   - Reads data/lessons/status.json for honest content badges. */

(function () {
  'use strict';

  const TOTAL_LESSONS = 50;
  const BOOK_I_END = 25;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Batch 1 fix: default is 'en' to match <html lang="en"> and I18n/Theme defaults.
  function currentLang() {
    try { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
    catch { return 'en'; }
  }

  function txt(en, bn) {
    const l = currentLang();
    return `<span data-en="${esc(en)}" data-bn="${esc(bn)}">${esc(l === 'en' ? en : bn)}</span>`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function readProgress() {
    return readJSON('nihongo_progress', null);
  }

  function slugFor(n) {
    return 'minna-' + String(n).padStart(3, '0');
  }

  function lessonHref(slug) {
    return 'lesson.html?lesson=' + encodeURIComponent(slug);
  }

  function hasAnyData(manifest) {
    if (!manifest || typeof manifest !== 'object') return false;
    const df = manifest.dataFiles;
    if (!df || typeof df !== 'object') return false;
    return Object.keys(df).some(k => df[k] !== null && df[k] !== undefined && df[k] !== '');
  }

  // ─── State ────────────────────────────────────────────────────────────
  const state = {
    ready: false,
    byNumber: new Map(),
    filter: 'all',
    book: 'all',
    content: {}
  };

  const FILTER_IDS = ['all', 'in-progress', 'completed', 'not-started'];
  const BOOK_IDS = ['all', '1', '2'];

  function readURL() {
    const params = new URLSearchParams(location.search);
    const f = params.get('filter');
    const b = params.get('book');
    const fixed = f === 'locked' ? 'not-started' : f;
    state.filter = FILTER_IDS.includes(fixed) ? fixed : 'all';
    state.book = BOOK_IDS.includes(b) ? b : 'all';
  }

  function writeURL(push) {
    const params = new URLSearchParams(location.search);
    if (state.filter === 'all') params.delete('filter');
    else params.set('filter', state.filter);
    if (state.book === 'all') params.delete('book');
    else params.set('book', state.book);
    const qs = params.toString();
    const url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    if (push) history.pushState({ filter: state.filter, book: state.book }, '', url);
    else history.replaceState({ filter: state.filter, book: state.book }, '', url);
  }

  // ─── Status resolution ────────────────────────────────────────────────
  function statusOf(n) {
    const manifest = state.byNumber.get(n);
    if (!hasAnyData(manifest)) {
      return { key: 'coming', percent: 0, manifest: manifest || null };
    }
    const progress = readProgress() || {};
    const completed = Number(progress.completedLessons) || 0;
    const current = Number(progress.currentLesson) || 1;
    const currentPct = Math.round((Number(progress.currentLessonProgress) || 0) * 100);

    if (n <= completed) return { key: 'completed', percent: 100, manifest };
    if (n === current) return { key: 'in-progress', percent: currentPct, manifest };
    return { key: 'not-started', percent: 0, manifest };
  }

  function statusText(status) {
    switch (status.key) {
      case 'completed':   return txt('Completed', 'সম্পন্ন');
      case 'in-progress': return txt('In progress ' + status.percent + '%', 'চলমান ' + status.percent + '%');
      case 'coming':      return txt('Coming soon', 'শীঘ্রই আসছে');
      default:            return txt('Not started', 'শুরু হয়নি');
    }
  }

  function renderContinue() {
    const el = $('#continue-card');
    if (!el) return;
    el.setAttribute('aria-busy', 'false');

    const progress = readProgress();
    if (!progress || !Number(progress.currentLesson)) {
      el.innerHTML = `
        <div class="lp-continue__inner">
          <p class="lp-continue__empty">${txt('Start your first lesson.', 'প্রথম পাঠ শুরু করুন।')}</p>
          <a class="lp-btn lp-btn--primary" href="lesson.html?lesson=minna-001">
            ${txt('Start Lesson 1', 'পাঠ ১ শুরু করুন')}
          </a>
        </div>
      `;
      return;
    }

    const n = Number(progress.currentLesson);
    const pct = Math.round((Number(progress.currentLessonProgress) || 0) * 100);
    const manifest = state.byNumber.get(n);
    const slug = (manifest && manifest.slug) || slugFor(n);
    const titleEn = (manifest && manifest.title && manifest.title.en)
      || (progress.currentLessonTitle && progress.currentLessonTitle.en)
      || ('Lesson ' + n);
    const titleBn = (manifest && manifest.title && manifest.title.bn)
      || (progress.currentLessonTitle && progress.currentLessonTitle.bn)
      || ('পাঠ ' + n);

    el.innerHTML = `
      <div class="lp-continue__inner">
        <div class="lp-continue__meta">
          <span class="lp-continue__eyebrow">${txt('Continue learning', 'শেখা চালিয়ে যান')}</span>
          <h2 class="lp-continue__title">
            ${txt('Lesson ' + n + ' — ' + titleEn, 'পাঠ ' + n + ' — ' + titleBn)}
          </h2>
          <div class="lp-continue__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
            <span style="width:${pct}%"></span>
          </div>
          <p class="lp-continue__pct">${txt(pct + '% complete', pct + '% সম্পন্ন')}</p>
        </div>
        <a class="lp-btn lp-btn--primary" href="${esc(lessonHref(slug))}">
          ${txt('Continue', 'চালিয়ে যান')}
        </a>
      </div>
    `;
  }

  const FILTERS = [
    { id: 'all',         en: 'All',         bn: 'সব' },
    { id: 'in-progress', en: 'In progress', bn: 'চলমান' },
    { id: 'completed',   en: 'Completed',   bn: 'সম্পন্ন' },
    { id: 'not-started', en: 'Not started', bn: 'শুরু হয়নি' }
  ];

  function renderFilters() {
    const el = $('#filters');
    if (!el) return;
    el.innerHTML = FILTERS.map(f => `
      <button type="button" class="lp-filter" data-filter="${f.id}"
              aria-pressed="${state.filter === f.id}">
        ${txt(f.en, f.bn)}
      </button>
    `).join('');
    $$('.lp-filter', el).forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        writeURL(true);
        renderFilters();
        applyFilters();
      });
    });
  }

  const BOOKS = [
    { id: 'all', en: 'All lessons', bn: 'সব পাঠ' },
    { id: '1',   en: 'Book I (N5)', bn: 'বই I (N5)' },
    { id: '2',   en: 'Book II (N4)', bn: 'বই II (N4)' }
  ];

  function renderBookTabs() {
    const el = $('#book-tabs');
    if (!el) return;
    el.innerHTML = BOOKS.map(b => `
      <button type="button" class="lp-booktab" data-book="${b.id}"
              aria-pressed="${state.book === b.id}">
        ${txt(b.en, b.bn)}
      </button>
    `).join('');
    $$('.lp-booktab', el).forEach(btn => {
      btn.addEventListener('click', () => {
        state.book = btn.dataset.book;
        writeURL(true);
        renderBookTabs();
        applyFilters();
      });
    });
  }

  function renderScrubber() {
    const el = $('#scrubber');
    if (!el) return;
    const items = [];
    for (let n = 1; n <= TOTAL_LESSONS; n++) {
      const status = statusOf(n);
      items.push(
        '<a class="lp-chip lp-chip--' + status.key + '" href="#lesson-' + n + '"' +
        ' aria-label="' + esc('Lesson ' + n) + '">' + n + '</a>'
      );
    }
    el.innerHTML = items.join('');
  }

  function loadContentStatus() {
    return fetch('data/lessons/status.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j && j.lessons) state.content = j.lessons; })
      .catch(() => {});
  }

  function contentBadge(c) {
    if (!c) return '';
    const label = {
      stub:     ['Preview', 'প্রিভিউ'],
      partial:  ['Partial', 'আংশিক'],
      draft:    ['Draft', 'খসড়া'],
      reviewed: ['Reviewed', 'পর্যালোচিত']
    }[c.status];
    if (!label) return '';
    return '<span class="cs-badge cs-badge--' + esc(c.status) + '">' + txt(label[0], label[1]) + '</span>' +
           '<p class="cs-words">' + txt(c.vocab + ' words', c.vocab + 'টি শব্দ') + '</p>';
  }

  function renderCard(n, status) {
    const manifest = status.manifest;
    const titleEn = (manifest && manifest.title && manifest.title.en) || ('Lesson ' + n);
    const titleBn = (manifest && manifest.title && manifest.title.bn) || ('পাঠ ' + n);
    const isComing = status.key === 'coming';

    const cslug = (manifest && manifest.slug) || slugFor(n);
    const inner = `
      <div class="lp-card__num" aria-hidden="true">${n}</div>
      <div class="lp-card__body">
        <h3 class="lp-card__title">${txt(titleEn, titleBn)}</h3>
        <p class="lp-card__status">${statusText(status)}</p>
        ${contentBadge(state.content[cslug])}
      </div>
      ${manifest && manifest.jlpt ? '<span class="lp-card__jlpt">' + esc(manifest.jlpt) + '</span>' : ''}
    `;

    if (isComing) {
      return '<div class="lp-card lp-card--coming" id="lesson-' + n +
             '" role="listitem" aria-disabled="true">' + inner + '</div>';
    }

    const slug = (manifest && manifest.slug) || slugFor(n);
    return '<a class="lp-card lp-card--' + status.key + '" id="lesson-' + n +
           '" role="listitem" href="' + esc(lessonHref(slug)) + '">' + inner + '</a>';
  }

  function renderGrid() {
    const book1 = $('#book-1-grid');
    const book2 = $('#book-2-grid');
    if (!book1 || !book2) return;

    const cards1 = [];
    const cards2 = [];
    for (let n = 1; n <= TOTAL_LESSONS; n++) {
      const html = renderCard(n, statusOf(n));
      if (n <= BOOK_I_END) cards1.push(html);
      else cards2.push(html);
    }
    book1.innerHTML = cards1.join('');
    book2.innerHTML = cards2.join('');
    book1.setAttribute('aria-busy', 'false');
    book2.setAttribute('aria-busy', 'false');
  }

  function applyFilters() {
    $$('.lp-card').forEach(card => {
      const n = Number(card.id.replace('lesson-', ''));
      const status = statusOf(n);
      const matchesFilter = state.filter === 'all' || state.filter === status.key;
      const bookOf = n <= BOOK_I_END ? '1' : '2';
      const matchesBook = state.book === 'all' || state.book === bookOf;
      card.hidden = !(matchesFilter && matchesBook);
    });

    let total = 0;
    ['book-1', 'book-2'].forEach(id => {
      const sec = document.getElementById(id);
      if (!sec) return;
      const visible = $$('.lp-card', sec).filter(c => !c.hidden).length;
      total += visible;
      sec.hidden = visible === 0;
    });
    const empty = document.getElementById('lp-empty');
    if (empty) empty.hidden = total > 0;
  }

  async function boot() {
    readURL();

    try {
      if (window.DataLoader && typeof window.DataLoader.loadCourse === 'function') {
        const course = await window.DataLoader.loadCourse();
        (course && course.lessons ? course.lessons : []).forEach(m => {
          if (m && m.lessonNumber) state.byNumber.set(Number(m.lessonNumber), m);
        });
      }
    } catch (err) {
      console.error('[lessons] course load failed:', err);
    }

    await loadContentStatus();

    state.ready = true;
    renderContinue();
    renderFilters();
    renderBookTabs();
    renderScrubber();
    renderGrid();
    applyFilters();

    if (window.I18n && typeof window.I18n.apply === 'function') {
      try { window.I18n.apply(window.I18n.get ? window.I18n.get() : undefined); } catch (e) {}
    }
  }

  window.addEventListener('popstate', () => {
    readURL();
    if (!state.ready) return;
    renderFilters();
    renderBookTabs();
    applyFilters();
  });

  window.addEventListener('storage', (e) => {
    if (!state.ready) return;
    if (e.key === 'nihongo_progress' || e.key === 'nihongo_lang' || e.key === null) {
      renderContinue();
      renderFilters();
      renderBookTabs();
      renderScrubber();
      renderGrid();
      applyFilters();
    }
  });

  window.Lessons = {
    reload: () => boot(),
    readURL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
