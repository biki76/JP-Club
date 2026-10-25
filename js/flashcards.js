/* js/flashcards.js
 * Phase 7 — Flashcard page UI.
 */
(function () {
  'use strict';

  const state = {
    lessons: [],
    selectedSlug: 'all',
    allVocab: [],
    queue: [],
    current: null,
    revealed: false,
    frontLang: 'jp',
    session: { total: 0, done: 0, grades: { again: 0, hard: 0, good: 0, easy: 0 } },
    loading: true,
    error: null
  };

  /* ─── Helpers ─────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function getLang() { return document.documentElement.lang === 'bn' ? 'bn' : 'en'; }
  function txt(en, bn) {
    const l = getLang();
    return `<span data-en="${esc(en)}" data-bn="${esc(bn)}">${esc(l === 'en' ? en : bn)}</span>`;
  }
  function ruby(base, furigana) {
    base = base || ''; furigana = furigana || '';
    if (!furigana) return esc(base);
    return `<ruby>${esc(base)}<rt>${esc(furigana)}</rt></ruby>`;
  }

  /* ─── Init ────────────────────────────────────── */
  async function init() {
    try {
      const params = new URLSearchParams(location.search);
      const course = await DataLoader.loadCourse();
      state.lessons = course.lessons.slice().sort((a, b) => a.lessonNumber - b.lessonNumber);

      const prefs = SRS.loadPrefs();
      state.frontLang = prefs.front || 'jp';
      state.selectedSlug = params.get('lesson') || prefs.lastLesson || 'all';

      await loadVocab();
      state.loading = false;
      startSession();
    } catch (e) {
      console.error(e);
      state.loading = false;
      state.error = e.message || String(e);
      render();
    }
  }

  async function loadVocab() {
    const toLoad = state.selectedSlug === 'all'
      ? state.lessons
      : state.lessons.filter(l => l.slug === state.selectedSlug);

    const results = await Promise.all(
      toLoad.map(l => DataLoader.loadLesson(l.slug).catch(e => {
        console.error('[flashcards] lesson load failed:', l.slug, e);
        return null;
      }))
    );

    state.allVocab = [];
    results.forEach(lesson => {
      if (!lesson) return;
      (lesson.vocabulary || []).forEach(v => {
        state.allVocab.push({
          key: `${lesson.slug}:${v.id}`,
          lessonSlug: lesson.slug,
          lessonNumber: lesson.manifest.lessonNumber,
          vocab: v
        });
      });
    });
  }

  /* ─── Session building ────────────────────────── */
  function startSession() {
    const now = Date.now();
    const store = SRS.loadCards();
    const log = SRS.loadLog();
    const todayLog = log[SRS.todayKey(now)] || { newIntroduced: 0 };
    const prefs = SRS.loadPrefs();
    const newCap = Math.max(0, (prefs.newPerDay || 20) - (todayLog.newIntroduced || 0));

    const due = [];
    const newAvail = [];

    for (const v of state.allVocab) {
      const card = store[v.key];
      if (!card) newAvail.push(v);
      else if (card.due <= now) due.push({ ...v, card, isNew: false });
    }

    due.sort((a, b) => a.card.due - b.card.due);
    newAvail.sort((a, b) => a.lessonNumber - b.lessonNumber);

    state.queue = [
      ...due,
      ...newAvail.slice(0, newCap).map(v => ({ ...v, card: SRS.newCardState(now), isNew: true }))
    ];

    state.session = { total: state.queue.length, done: 0,
                      grades: { again: 0, hard: 0, good: 0, easy: 0 } };
    state.current = null;
    state.revealed = false;
    advance();
    render();
  }

  function studyAhead() {
    const now = Date.now();
    const store = SRS.loadCards();
    const future = [];
    for (const v of state.allVocab) {
      const card = store[v.key];
      if (card && card.due > now) future.push({ ...v, card, isNew: false });
    }
    future.sort((a, b) => a.card.due - b.card.due);
    const take = future.slice(0, 10);
    if (!take.length) return;

    state.queue = take;
    state.session = { total: take.length, done: 0,
                      grades: { again: 0, hard: 0, good: 0, easy: 0 } };
    state.current = null;
    state.revealed = false;
    advance();
    render();
  }

  function advance() {
    if (!state.queue.length) { state.current = null; state.revealed = false; return; }
    state.current = state.queue[0];
    state.revealed = false;
  }

  function grade(g) {
    if (!state.revealed || !state.current) return;
    const now = Date.now();
    const current = state.current;
    const next = SRS.schedule(current.card, g, now);

    const store = SRS.loadCards();
    store[current.key] = next;
    SRS.saveCards(store);

    const log = SRS.loadLog();
    const dk = SRS.todayKey(now);
    if (!log[dk]) log[dk] = { again: 0, hard: 0, good: 0, easy: 0, total: 0, newIntroduced: 0 };
    log[dk][g] = (log[dk][g] || 0) + 1;
    log[dk].total = (log[dk].total || 0) + 1;
    if (current.isNew) log[dk].newIntroduced = (log[dk].newIntroduced || 0) + 1;
    SRS.saveLog(log);

    const meta = SRS.loadMeta();
    meta.totalReviews = (meta.totalReviews || 0) + 1;
    SRS.updateStreak(meta, dk);
    SRS.saveMeta(meta);

    state.session.grades[g]++;
    if (g !== 'again') state.session.done++;

    state.queue.shift();
    if (g === 'again') state.queue.push({ ...current, card: next, isNew: false });

    advance();
    render();
  }

  function reveal() {
    if (!state.current || state.revealed) return;
    state.revealed = true;
    render();
  }

  /* ─── Render ──────────────────────────────────── */
  function render() {
    const root = document.getElementById('fc-page');
    if (!root) return;

    if (state.loading) {
      root.innerHTML = `<div class="fc-loading">${txt('Loading…', 'লোড হচ্ছে…')}</div>`;
      return;
    }
    if (state.error) {
      root.innerHTML = `
        <div class="fc-error" role="alert">
          <h2>${txt('Could not load flashcards', 'ফ্ল্যাশকার্ড লোড করা যায়নি')}</h2>
          <p>${esc(state.error)}</p>
          <a href="home.html" class="btn btn--primary">${txt('Back to home', 'হোমে ফিরে যান')}</a>
        </div>`;
      return;
    }

    root.innerHTML = `
      ${renderHeader()}
      ${renderStats()}
      ${renderCardArea()}
      ${renderFooter()}
    `;
    wire();
  }

  function renderHeader() {
    return `
      <header class="fc-header">
        <div class="fc-header__top">
          <h1 class="fc-header__title">${txt('Flashcards', 'ফ্ল্যাশকার্ড')}</h1>
          <div class="fc-header__controls">
            <label class="fc-field">
              <span class="fc-field__label">${txt('Lesson', 'পাঠ')}</span>
              <select class="select fc-select" id="fc-lesson">
                <option value="all"${state.selectedSlug === 'all' ? ' selected' : ''}>${txt('All lessons', 'সব পাঠ')}</option>
                ${state.lessons.map(l => `
                  <option value="${esc(l.slug)}"${state.selectedSlug === l.slug ? ' selected' : ''}>
                    Lesson ${l.lessonNumber} — ${esc(getLang() === 'en' ? l.title.en : l.title.bn)}
                  </option>
                `).join('')}
              </select>
            </label>
          </div>
        </div>
        <div class="fc-header__front">
          <span class="fc-front__label">${txt('Front side:', 'সামনের দিক:')}</span>
          <div class="fc-front__group" role="radiogroup" aria-label="Front language">
            ${['jp', 'bn', 'en'].map(lang => `
              <button type="button" class="fc-front__btn${state.frontLang === lang ? ' is-active' : ''}"
                      role="radio" aria-checked="${state.frontLang === lang}" data-front="${lang}">
                ${lang === 'jp' ? '日本語' : lang === 'bn' ? 'বাংলা' : 'EN'}
              </button>
            `).join('')}
          </div>
        </div>
      </header>
    `;
  }

  function renderStats() {
    const now = Date.now();
    const store = SRS.loadCards();
    const log = SRS.loadLog();
    const meta = SRS.loadMeta();
    const today = log[SRS.todayKey(now)] || { total: 0 };

    let dueCount = 0, newCount = 0, youngCount = 0, matureCount = 0;
    for (const v of state.allVocab) {
      const card = store[v.key];
      if (!card) { newCount++; continue; }
      if (card.due <= now) dueCount++;
      const cls = SRS.classify(card);
      if (cls === 'young') youngCount++;
      else if (cls === 'mature') matureCount++;
    }

    return `
      <div class="fc-stats">
        <div class="fc-stat">
          <div class="fc-stat__num">${today.total || 0}</div>
          <div class="fc-stat__label">${txt('Reviewed today', 'আজ পঠিত')}</div>
        </div>
        <div class="fc-stat">
          <div class="fc-stat__num">${meta.streakCurrent || 0}</div>
          <div class="fc-stat__label">${txt('Day streak', 'দিনের স্ট্রিক')}</div>
        </div>
        <div class="fc-stat">
          <div class="fc-stat__num">${dueCount}</div>
          <div class="fc-stat__label">${txt('Due now', 'এখন বাকি')}</div>
        </div>
        <div class="fc-stat">
          <div class="fc-stat__num">${newCount}</div>
          <div class="fc-stat__label">${txt('New', 'নতুন')}</div>
        </div>
        <div class="fc-stat fc-stat--muted">
          <div class="fc-stat__num">${youngCount} · ${matureCount}</div>
          <div class="fc-stat__label">${txt('Young · Mature', 'ইয়াং · ম্যাচিউর')}</div>
        </div>
      </div>
    `;
  }

  function renderCardArea() {
    if (!state.allVocab.length) {
      return `
        <div class="fc-empty">
          <p class="fc-empty__title">${txt('No vocabulary in this selection', 'এই নির্বাচনে কোনো শব্দভাণ্ডার নেই')}</p>
          <p class="fc-empty__hint">${txt('Choose a different lesson or add vocabulary to your data files.', 'অন্য পাঠ বেছে নিন বা ডেটা ফাইলে শব্দভাণ্ডার যোগ করুন।')}</p>
        </div>
      `;
    }
    if (!state.current) {
      const hadSession = state.session.total > 0;
      return `
        <div class="fc-empty">
          <div class="fc-empty__icon" aria-hidden="true">${hadSession ? '✓' : '☕'}</div>
          <p class="fc-empty__title">${hadSession ? txt('Session complete!', 'সেশন সম্পন্ন!') : txt('All caught up', 'সব শেষ')}</p>
          <p class="fc-empty__hint">${
            hadSession
              ? txt('You completed ' + state.session.done + ' cards.', 'আপনি ' + state.session.done + ' টি কার্ড শেষ করেছেন।')
              : txt('Nothing due right now. Check back later or study ahead.', 'এখন কোনো কার্ড বাকি নেই। পরে আবার আসুন বা আগে পড়ুন।')
          }</p>
          <div class="fc-empty__actions">
            ${hadSession ? `<button type="button" class="btn btn--primary" id="fc-restart">${txt('Start another session', 'আরেকটি সেশন শুরু করুন')}</button>` : ''}
            <button type="button" class="btn btn--soft" id="fc-ahead">${txt('Study ahead', 'আগে পড়ুন')}</button>
          </div>
        </div>
      `;
    }

    const preview = SRS.preview(state.current.card, Date.now());

    return `
      <div class="fc-card-wrap">
        <div class="fc-card${state.revealed ? ' is-revealed' : ''}" role="button" tabindex="0" id="fc-card" aria-label="Flip card">
          ${!state.revealed
            ? `<div class="fc-card__front">${cardFront(state.current)}</div>`
            : `<div class="fc-card__back"><div class="fc-card__back-inner">${cardBack(state.current)}</div></div>`}
        </div>
        ${!state.revealed
          ? `<button type="button" class="btn btn--primary btn--lg fc-reveal" id="fc-reveal">
               ${txt('Show answer', 'উত্তর দেখান')} <kbd>Space</kbd>
             </button>`
          : `<div class="fc-grades">
              ${SRS.GRADES.map(g => `
                <button type="button" class="fc-grade fc-grade--${g}" data-grade="${g}">
                  <span class="fc-grade__name">${gradeName(g)}</span>
                  <span class="fc-grade__interval">${preview[g].label}</span>
                  <span class="fc-grade__key">${gradeKey(g)}</span>
                </button>
              `).join('')}
            </div>`}
      </div>
    `;
  }

  function renderFooter() {
    if (!state.session.total) return '';
    const pct = (state.session.done / state.session.total) * 100;
    return `
      <div class="fc-footer">
        <div class="fc-progress"><div class="fc-progress__bar" style="width:${pct}%"></div></div>
        <div class="fc-footer__row">
          <span class="fc-footer__text">${state.session.done} / ${state.session.total} ${txt('reviewed', 'রিভিউ হয়েছে')}</span>
          <button type="button" class="btn btn--ghost btn--sm" id="fc-end">${txt('End session', 'সেশন শেষ করুন')}</button>
        </div>
      </div>
    `;
  }

  /* ─── Card content ────────────────────────────── */
  function cardFront(item) {
    return renderSide(item.vocab, state.frontLang, true);
  }

  function cardBack(item) {
    const v = item.vocab;
    const others = ['jp', 'bn', 'en'].filter(l => l !== state.frontLang);
    return `
      <div class="fc-back__others">
        ${others.map(l => `
          <div class="fc-back__row">
            <span class="fc-back__lang">${langName(l)}</span>
            <div class="fc-back__content">${renderSide(v, l, false)}</div>
          </div>
        `).join('')}
      </div>
      ${v.romaji ? `<div class="fc-back__romaji">${esc(v.romaji)}</div>` : ''}
    `;
  }

  function renderSide(v, lang, isFront) {
    if (lang === 'jp') {
      const jp = v.kanji ? ruby(v.kanji, v.furigana) : esc(v.furigana || '');
      return `<div class="fc-jp" lang="ja">${jp}</div>`;
    }
    if (lang === 'bn') return `<div class="fc-bn" lang="bn">${esc(v.bengali_meaning || '')}</div>`;
    if (lang === 'en') return `<div class="fc-en" lang="en">${esc(v.english_meaning || '')}</div>`;
    return '';
  }

  function langName(lang) { return lang === 'jp' ? '日本語' : lang === 'bn' ? 'বাংলা' : 'English'; }

  function gradeName(g) {
    const map = {
      again: ['Again', 'আবার'],
      hard:  ['Hard',  'কঠিন'],
      good:  ['Good',  'ভালো'],
      easy:  ['Easy',  'সহজ']
    }[g] || [g, g];
    return txt(map[0], map[1]);
  }
  function gradeKey(g) { return { again: '1', hard: '2', good: '3', easy: '4' }[g]; }

  /* ─── Wiring ──────────────────────────────────── */
  function wire() {
    const lessonSel = document.getElementById('fc-lesson');
    if (lessonSel) {
      lessonSel.addEventListener('change', async e => {
        const slug = e.target.value;
        state.selectedSlug = slug;
        const prefs = SRS.loadPrefs();
        prefs.lastLesson = slug;
        SRS.savePrefs(prefs);
        try {
          const qs = slug === 'all' ? '' : '?lesson=' + encodeURIComponent(slug);
          history.replaceState(null, '', location.pathname + qs);
        } catch (er) {}

        state.loading = true;
        state.error = null;
        render();
        try {
          await loadVocab();
          state.loading = false;
          startSession();
        } catch (er) {
          state.loading = false;
          state.error = er.message || String(er);
          render();
        }
      });
    }

    document.querySelectorAll('.fc-front__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.frontLang = btn.dataset.front;
        const prefs = SRS.loadPrefs();
        prefs.front = state.frontLang;
        SRS.savePrefs(prefs);
        render();
      });
    });

    const card = document.getElementById('fc-card');
    if (card) {
      card.addEventListener('click', reveal);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
      });
    }

    const revealBtn = document.getElementById('fc-reveal');
    if (revealBtn) revealBtn.addEventListener('click', reveal);

    document.querySelectorAll('.fc-grade').forEach(btn => {
      btn.addEventListener('click', () => grade(btn.dataset.grade));
    });

    const aheadBtn = document.getElementById('fc-ahead');
    if (aheadBtn) aheadBtn.addEventListener('click', studyAhead);

    const restartBtn = document.getElementById('fc-restart');
    if (restartBtn) restartBtn.addEventListener('click', () => startSession());

    const endBtn = document.getElementById('fc-end');
    if (endBtn) endBtn.addEventListener('click', () => {
      state.queue = [];
      state.current = null;
      state.session.total = state.session.done;
      render();
    });
  }

  /* ─── Keyboard shortcuts ──────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, select, textarea')) return;
    if (!state.current) return;

    if (!state.revealed) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
      return;
    }
    const map = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
    if (map[e.key]) { e.preventDefault(); grade(map[e.key]); }
  });

  /* ─── Re-render on language change ────────────── */
  try {
    new MutationObserver(() => {
      if (document.getElementById('fc-page')) render();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  } catch (e) {}

  /* ─── Boot ────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
