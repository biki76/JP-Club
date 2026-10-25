/* js/lesson.js
 * Phase 5 — Lesson page template.
 * Renders lesson data loaded via DataLoader into a single-page tab UI.
 */
(function () {
  'use strict';

  const KEY = {
    progress:  'nihongo_progress',
    bookmarks: 'nihongo_bookmarks',
    furigana:  'nihongo_furigana'
  };

  const state = {
    slug: null,
    lesson: null,
    sortedLessons: [],
    currentIdx: -1,
    courseId: null,
    totalLessons: null
  };

  /* ─── Utilities ─────────────────────────────────────── */
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
    base = base == null ? '' : String(base);
    furigana = furigana == null ? '' : String(furigana);
    if (!base && !furigana) return '';
    if (!furigana) return esc(base);
    if (!base) return esc(furigana);
    return `<ruby>${esc(base)}<rt>${esc(furigana)}</rt></ruby>`;
  }
  function readJson(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ─── Bootstrap ─────────────────────────────────────── */
  async function init() {
    try {
      const params = new URLSearchParams(location.search);
      let slug = params.get('lesson');

      const index = await DataLoader.loadIndex();
      state.courseId = index.courseId;
      state.totalLessons = index.totalLessons || null;

      const course = await DataLoader.loadCourse();
      state.sortedLessons = course.lessons.slice().sort((a, b) => a.lessonNumber - b.lessonNumber);

      if (!slug) slug = state.sortedLessons[0] ? state.sortedLessons[0].slug : null;
      if (!slug || !state.sortedLessons.some(l => l.slug === slug)) {
        renderError(getLang() === 'en'
          ? 'Lesson not found: ' + (slug || '(none)')
          : 'পাঠ পাওয়া যায়নি: ' + (slug || '(কোনো নয়)'));
        return;
      }

      state.slug = slug;
      state.lesson = await DataLoader.loadLesson(slug);
      state.currentIdx = state.sortedLessons.findIndex(l => l.slug === slug);

      render();
    } catch (e) {
      console.error(e);
      renderError(e.message || String(e));
    }
  }

  /* ─── Render root ───────────────────────────────────── */
  function render() {
    const root = document.getElementById('lesson-page');
    if (!root) return;
    root.innerHTML = `
      ${renderHeader()}
      ${renderTabs()}
      <div class="lesson-panels">
        ${renderVocabPanel()}
        ${renderGrammarPanel()}
        ${renderKanjiPanel()}
        ${renderReadingPanel()}
        ${renderListeningPanel()}
        ${renderPracticePanel()}
      </div>
      ${renderPager()}
    `;

    setupTabs();
    setupFuriganaToggle();
    setupBookmark();
    setupMarkComplete();
    setupPractice();
  }

  /* ─── Header ────────────────────────────────────────── */
  function renderHeader() {
    const m = state.lesson.manifest;
    const isComplete   = isLessonComplete();
    const isBookmarked = isLessonBookmarked();
    return `
      <header class="lesson-header">
        <nav class="lesson-header__crumb" aria-label="Breadcrumb">
          <a href="home.html">${txt('Home', 'হোম')}</a>
          <span class="lesson-header__sep" aria-hidden="true">/</span>
          <a href="#">${txt('Minna Beginner', 'মিন্না বিগিনার')}</a>
          <span class="lesson-header__sep" aria-hidden="true">/</span>
          <span aria-current="page">${txt('Lesson', 'পাঠ')} ${m.lessonNumber}</span>
        </nav>

        <div class="lesson-header__row">
          <div class="lesson-header__main">
            <div class="lesson-header__eyebrow">
              <span class="badge badge--primary">${esc(m.jlpt || 'N5')}</span>
              <span class="badge badge--neutral">${txt('Lesson', 'পাঠ')} ${m.lessonNumber}</span>
              ${m.durationMin ? `<span class="badge badge--neutral">${m.durationMin} ${txt('min', 'মিনিট')}</span>` : ''}
            </div>
            <h1 class="lesson-header__title">${txt(m.title.en, m.title.bn)}</h1>
            ${m.subtitle ? `<p class="lesson-header__subtitle">${txt(m.subtitle.en, m.subtitle.bn)}</p>` : ''}
          </div>

          <div class="lesson-header__actions">
            <button type="button" class="btn btn--ghost lesson-furigana-btn" id="lesson-furigana-btn" aria-pressed="true">
              <span class="lesson-furigana-label">Furigana: on</span>
            </button>
            <button type="button" class="btn btn--secondary" id="lesson-bookmark-btn" aria-pressed="${isBookmarked}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span class="lesson-bookmark-label">${isBookmarked ? txt('Bookmarked', 'বুকমার্ক করা') : txt('Bookmark', 'বুকমার্ক')}</span>
            </button>
            <button type="button" class="btn btn--primary" id="lesson-complete-btn">
              <span class="lesson-complete-label">${isComplete ? txt('Completed ✓', 'সম্পন্ন ✓') : txt('Mark lesson complete', 'পাঠ সম্পন্ন করুন')}</span>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  /* ─── Tabs ──────────────────────────────────────────── */
  function renderTabs() {
    const tabs = [
      { key: 'vocabulary', en: 'Vocabulary', bn: 'শব্দভাণ্ডার' },
      { key: 'grammar',    en: 'Grammar',    bn: 'ব্যাকরণ' },
      { key: 'kanji',      en: 'Kanji',      bn: 'কাঞ্জি' },
      { key: 'reading',    en: 'Reading',    bn: 'পঠন' },
      { key: 'listening',  en: 'Listening',  bn: 'শ্রবণ' },
      { key: 'practice',   en: 'Practice',   bn: 'অনুশীলন' }
    ];
    return `
      <div class="lesson-tabs" role="tablist" aria-label="Lesson sections">
        ${tabs.map((t, i) => `
          <button type="button" role="tab" class="lesson-tab" data-tab="${t.key}"
                  aria-selected="${i === 0 ? 'true' : 'false'}"
                  aria-controls="panel-${t.key}" id="tab-${t.key}"
                  tabindex="${i === 0 ? '0' : '-1'}">
            ${txt(t.en, t.bn)}
          </button>
        `).join('')}
      </div>
    `;
  }

  /* ─── Panels ────────────────────────────────────────── */
  function panelAttrs(key) {
    return `id="panel-${key}" class="lesson-panel" role="tabpanel" aria-labelledby="tab-${key}" data-tab-panel="${key}"${key === 'vocabulary' ? '' : ' hidden'}`;
  }

  function renderVocabPanel() {
    const items = state.lesson.vocabulary || [];
    if (!items.length) return emptyPanel('vocabulary', 'Vocabulary', 'শব্দভাণ্ডার');
    return `
      <section ${panelAttrs('vocabulary')}>
        <div class="lesson-vocab-grid">
          ${items.map(v => `
            <article class="lesson-vocab">
              <div class="lesson-vocab__jp" lang="ja">${ruby(v.kanji, v.furigana)}</div>
              ${v.romaji ? `<div class="lesson-vocab__romaji">${esc(v.romaji)}</div>` : ''}
              <div class="lesson-vocab__meaning">${txt(v.english_meaning, v.bengali_meaning)}</div>
              ${v.tags && v.tags.length
                ? `<div class="lesson-vocab__tags">${v.tags.map(t => `<span class="badge badge--neutral">${esc(t)}</span>`).join('')}</div>`
                : ''}
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderGrammarPanel() {
    const items = state.lesson.grammar || [];
    if (!items.length) return emptyPanel('grammar', 'Grammar', 'ব্যাকরণ');
    return `
      <section ${panelAttrs('grammar')}>
        <div class="lesson-grammar-list">
          ${items.map(g => `
            <article class="lesson-grammar">
              <header class="lesson-grammar__head">
                <h3 class="lesson-grammar__pattern" lang="ja">${esc(g.pattern)}</h3>
                <p class="lesson-grammar__meaning">${txt(g.meaning_en, g.meaning_bn)}</p>
              </header>
              <ul class="lesson-grammar__examples">
                ${(g.examples || []).map(ex => `
                  <li class="lesson-example">
                    <p class="lesson-example__jp" lang="ja">${ruby(ex.jp, ex.furigana)}</p>
                    ${ex.romaji ? `<p class="lesson-example__romaji">${esc(ex.romaji)}</p>` : ''}
                    <p class="lesson-example__tr">${txt(ex.en, ex.bn)}</p>
                  </li>
                `).join('')}
              </ul>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderKanjiPanel() {
    const items = state.lesson.kanji || [];
    if (!items.length) return emptyPanel('kanji', 'Kanji', 'কাঞ্জি');
    return `
      <section ${panelAttrs('kanji')}>
        <div class="lesson-kanji-grid">
          ${items.map(k => `
            <article class="lesson-kanji">
              <div class="lesson-kanji__char" lang="ja">${esc(k.character)}</div>
              <dl class="lesson-kanji__details">
                <div><dt>${txt("On’yomi", 'অন-ইওমি')}</dt><dd lang="ja">${esc((k.onyomi || []).join('、')) || '—'}</dd></div>
                <div><dt>${txt("Kun’yomi", 'কুন-ইওমি')}</dt><dd lang="ja">${esc((k.kunyomi || []).join('、')) || '—'}</dd></div>
                <div><dt>${txt('Meaning', 'অর্থ')}</dt><dd>${txt((k.meanings.en || []).join('; '), (k.meanings.bn || []).join('; '))}</dd></div>
                <div><dt>${txt('Radicals', 'রেডিক্যাল')}</dt><dd lang="ja">${esc((k.radicals || []).join('、'))}</dd></div>
                <div><dt>${txt('Strokes', 'স্ট্রোক')}</dt><dd>${k.strokes}</dd></div>
              </dl>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderReadingPanel() {
    const items = state.lesson.reading || [];
    if (!items.length) return emptyPanel('reading', 'Reading', 'পঠন');
    return `
      <section ${panelAttrs('reading')}>
        <div class="lesson-reading-list">
          ${items.map(r => `
            <article class="lesson-reading">
              <h3 class="lesson-reading__title">${txt(r.title.en, r.title.bn)}</h3>
              <div class="lesson-reading__passage">
                ${(r.passage || []).map(p => sentenceHtml(p)).join('')}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderListeningPanel() {
    const items = state.lesson.listening || [];
    if (!items.length) return emptyPanel('listening', 'Listening', 'শ্রবণ');
    return `
      <section ${panelAttrs('listening')}>
        <div class="lesson-listening-list">
          ${items.map(l => `
            <article class="lesson-listening">
              <h3 class="lesson-listening__title">${txt(l.title.en, l.title.bn)}</h3>
              ${l.audio_url
                ? `<audio class="lesson-listening__audio" controls preload="none" src="${esc(l.audio_url)}"></audio>`
                : `<p class="lesson-listening__noaudio">${txt('Audio coming soon', 'অডিও শীঘ্রই আসছে')}</p>`}
              <details class="lesson-listening__transcript">
                <summary>${txt('Show transcript', 'ট্রান্সক্রিপ্ট দেখান')}</summary>
                <div class="lesson-transcript">
                  ${(l.transcript || []).map(p => sentenceHtml(p)).join('')}
                </div>
              </details>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function sentenceHtml(p) {
    return `
      <p class="lesson-sentence">
        <span class="lesson-sentence__jp" lang="ja">${ruby(p.jp, p.furigana)}</span>
        ${p.romaji ? `<span class="lesson-sentence__romaji">${esc(p.romaji)}</span>` : ''}
        <span class="lesson-sentence__tr">${txt(p.en, p.bn)}</span>
      </p>
    `;
  }

  function renderPracticePanel() {
    const items = state.lesson.practice || [];
    if (!items.length) return emptyPanel('practice', 'Practice', 'অনুশীলন');
    return `
      <section ${panelAttrs('practice')}>
        <div class="lesson-practice-list">
          ${items.map(q => `
            <article class="lesson-practice" data-qid="${esc(q.id)}" data-correct="${q.correctIndex}" data-answered="false">
              <p class="lesson-practice__prompt">${txt(q.prompt.en, q.prompt.bn)}</p>
              <p class="lesson-practice__stem" lang="ja">${ruby(q.stem.jp, q.stem.furigana)}</p>
              ${q.stem.romaji ? `<p class="lesson-practice__romaji">${esc(q.stem.romaji)}</p>` : ''}
              <ul class="lesson-practice__options">
                ${(q.options || []).map((opt, i) => `
                  <li><button type="button" class="lesson-practice__option" data-index="${i}" lang="ja">${esc(opt)}</button></li>
                `).join('')}
              </ul>
              <p class="lesson-practice__feedback" hidden></p>
              <button type="button" class="btn btn--ghost btn--sm lesson-practice__reset" hidden>
                ${txt('Try again', 'আবার চেষ্টা করুন')}
              </button>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function emptyPanel(key, en, bn) {
    return `
      <section ${panelAttrs(key)}>
        <div class="lesson-empty">
          <p class="lesson-empty__title">${txt('Nothing here yet', 'এখনো কিছু নেই')}</p>
          <p class="lesson-empty__hint">${txt(en + ' content is coming soon for this lesson.', 'এই পাঠে ' + bn + ' বিষয়বস্তু শীঘ্রই আসছে।')}</p>
        </div>
      </section>
    `;
  }

  function renderPager() {
    const prev = state.sortedLessons[state.currentIdx - 1];
    const next = state.sortedLessons[state.currentIdx + 1];
    return `
      <nav class="lesson-pager" aria-label="Lesson navigation">
        ${prev ? `
          <a class="lesson-pager__link" href="lesson.html?lesson=${encodeURIComponent(prev.slug)}">
            <span class="lesson-pager__dir">← ${txt('Previous', 'আগের')}</span>
            <span class="lesson-pager__title">${txt(prev.title.en, prev.title.bn)}</span>
            <span class="lesson-pager__num">${txt('Lesson', 'পাঠ')} ${prev.lessonNumber}</span>
          </a>` : `
          <span class="lesson-pager__link lesson-pager__link--disabled" aria-disabled="true">
            <span class="lesson-pager__dir">← ${txt('Previous', 'আগের')}</span>
            <span class="lesson-pager__title">${txt('No previous lesson', 'পূর্ববর্তী পাঠ নেই')}</span>
          </span>`}
        ${next ? `
          <a class="lesson-pager__link lesson-pager__link--next" href="lesson.html?lesson=${encodeURIComponent(next.slug)}">
            <span class="lesson-pager__dir">${txt('Next', 'পরের')} →</span>
            <span class="lesson-pager__title">${txt(next.title.en, next.title.bn)}</span>
            <span class="lesson-pager__num">${txt('Lesson', 'পাঠ')} ${next.lessonNumber}</span>
          </a>` : `
          <span class="lesson-pager__link lesson-pager__link--next lesson-pager__link--disabled" aria-disabled="true">
            <span class="lesson-pager__dir">${txt('Next', 'পরের')} →</span>
            <span class="lesson-pager__title">${txt('No next lesson', 'পরবর্তী পাঠ নেই')}</span>
          </span>`}
      </nav>
    `;
  }

  /* ─── Tabs interaction ──────────────────────────────── */
  function setupTabs() {
    const tabs = Array.from(document.querySelectorAll('.lesson-tab'));
    const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));
    if (!tabs.length) return;

    function activate(name, focus) {
      tabs.forEach(t => {
        const on = t.dataset.tab === name;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach(p => { p.hidden = p.dataset.tabPanel !== name; });
      try { history.replaceState(null, '', '#' + name); } catch (e) {}
    }

    tabs.forEach(t => {
      t.addEventListener('click', () => activate(t.dataset.tab, false));
      t.addEventListener('keydown', e => {
        const i = tabs.indexOf(t);
        let ni = -1;
        if (e.key === 'ArrowRight') ni = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') ni = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') ni = 0;
        else if (e.key === 'End')  ni = tabs.length - 1;
        if (ni >= 0) { e.preventDefault(); activate(tabs[ni].dataset.tab, true); }
      });
    });

    const hash = location.hash.slice(1);
    if (hash && tabs.some(t => t.dataset.tab === hash)) activate(hash, false);
  }

  /* ─── Furigana toggle (syncs with shell's control) ───── */
  function setupFuriganaToggle() {
    const btn = document.getElementById('lesson-furigana-btn');
    if (!btn) return;
    const label = btn.querySelector('.lesson-furigana-label');

    function reflect() {
      const on = document.documentElement.getAttribute('data-furigana') === 'on';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const lang = getLang();
      if (label) {
        label.textContent = on
          ? (lang === 'en' ? 'Furigana: on'  : 'ফুরিগানা: চালু')
          : (lang === 'en' ? 'Furigana: off' : 'ফুরিগানা: বন্ধ');
      }
    }

    btn.addEventListener('click', () => {
      const on = document.documentElement.getAttribute('data-furigana') === 'on';
      const next = on ? 'off' : 'on';
      document.documentElement.setAttribute('data-furigana', next);
      try { localStorage.setItem(KEY.furigana, next); } catch (e) {}
      reflect();
    });

    try {
      new MutationObserver(reflect).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-furigana', 'lang']
      });
    } catch (e) {}

    reflect();
  }

  /* ─── Bookmark ──────────────────────────────────────── */
  function setupBookmark() {
    const btn = document.getElementById('lesson-bookmark-btn');
    if (!btn) return;
    const label = btn.querySelector('.lesson-bookmark-label');

    function reflect() {
      const on = isLessonBookmarked();
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (label) label.innerHTML = on ? txt('Bookmarked', 'বুকমার্ক করা') : txt('Bookmark', 'বুকমার্ক');
    }

    btn.addEventListener('click', () => {
      const bm = readBookmarks();
      if (bm[state.slug]) delete bm[state.slug];
      else bm[state.slug] = Date.now();
      writeJson(KEY.bookmarks, bm);
      reflect();
      const l = getLang();
      const added = !!bm[state.slug];
      showToast(added
        ? (l === 'en' ? 'Bookmarked'        : 'বুকমার্ক করা হয়েছে')
        : (l === 'en' ? 'Bookmark removed'  : 'বুকমার্ক সরানো হয়েছে'));
    });

    reflect();
  }

  /* ─── Mark complete ─────────────────────────────────── */
  function setupMarkComplete() {
    const btn = document.getElementById('lesson-complete-btn');
    if (!btn) return;
    const label = btn.querySelector('.lesson-complete-label');

    function reflect() {
      const complete = isLessonComplete();
      if (label) label.innerHTML = complete ? txt('Completed ✓', 'সম্পন্ন ✓') : txt('Mark lesson complete', 'পাঠ সম্পন্ন করুন');
      btn.disabled = complete;
      btn.classList.toggle('btn--primary', !complete);
      btn.classList.toggle('btn--secondary', complete);
    }

    btn.addEventListener('click', () => {
      markLessonComplete();
      reflect();
    });

    reflect();
    try {
      new MutationObserver(reflect).observe(document.documentElement, {
        attributes: true, attributeFilter: ['lang']
      });
    } catch (e) {}
  }

  /* ─── Practice ──────────────────────────────────────── */
  function setupPractice() {
    document.querySelectorAll('.lesson-practice').forEach(card => {
      const correct  = Number(card.dataset.correct);
      const options  = Array.from(card.querySelectorAll('.lesson-practice__option'));
      const feedback = card.querySelector('.lesson-practice__feedback');
      const reset    = card.querySelector('.lesson-practice__reset');

      options.forEach(opt => {
        opt.addEventListener('click', () => {
          if (card.dataset.answered === 'true') return;
          card.dataset.answered = 'true';
          const chosen = Number(opt.dataset.index);
          const isCorrect = chosen === correct;
          opt.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
          if (!isCorrect && options[correct]) options[correct].classList.add('is-correct');
          options.forEach(o => { o.disabled = true; });
          if (feedback) {
            feedback.hidden = false;
            feedback.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
            const lang = getLang();
            feedback.textContent = isCorrect
              ? (lang === 'en' ? '✓ Correct!'  : '✓ সঠিক!')
              : (lang === 'en' ? '✗ Not quite' : '✗ ঠিক নয়');
          }
          if (reset) reset.hidden = false;
        });
      });

      if (reset) {
        reset.addEventListener('click', () => {
          card.dataset.answered = 'false';
          options.forEach(o => {
            o.disabled = false;
            o.classList.remove('is-correct', 'is-wrong');
          });
          if (feedback) { feedback.hidden = true; feedback.textContent = ''; }
          reset.hidden = true;
        });
      }
    });
  }

  /* ─── Progress helpers ──────────────────────────────── */
  function isLessonBookmarked() {
    return !!readBookmarks()[state.slug];
  }

  function isLessonComplete() {
    const p = readJson(KEY.progress, null);
    if (!p || !state.lesson) return false;
    if (p.courseId !== state.lesson.manifest.courseId) return false;
    return (p.completedLessons || 0) >= state.lesson.manifest.lessonNumber;
  }

  function markLessonComplete() {
    if (!state.lesson) return;
    const m = state.lesson.manifest;
    const total = state.totalLessons || state.sortedLessons.length || m.lessonNumber;
    const next = state.sortedLessons.find(l => l.lessonNumber === m.lessonNumber + 1);
    const p = readJson(KEY.progress, null) || {};

    p.courseId = m.courseId;
    p.totalLessons = total;
    p.completedLessons = Math.max(p.completedLessons || 0, m.lessonNumber);

    if (next) {
      p.currentLesson = next.lessonNumber;
      p.currentLessonTitle = next.title;
      p.currentLessonProgress = 0;
    } else {
      p.currentLesson = m.lessonNumber;
      p.currentLessonTitle = m.title;
      p.currentLessonProgress = 1;
    }
    p.updatedAt = Date.now();

    writeJson(KEY.progress, p);

    showToast(getLang() === 'en'
      ? 'Lesson marked complete ✓'
      : 'পাঠ সম্পন্ন হয়েছে ✓');
  }

  function readBookmarks() {
    const raw = readJson(KEY.bookmarks, {});
    if (Array.isArray(raw)) {
      const obj = {};
      raw.forEach(s => { obj[s] = Date.now(); });
      return obj;
    }
    return raw && typeof raw === 'object' ? raw : {};
  }

  /* ─── Toast ─────────────────────────────────────────── */
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'lesson-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('lesson-toast--in'));
    setTimeout(() => {
      t.classList.remove('lesson-toast--in');
      setTimeout(() => t.remove(), 300);
    }, 2200);
  }

  /* ─── Error ─────────────────────────────────────────── */
  function renderError(msg) {
    const root = document.getElementById('lesson-page');
    if (!root) return;
    root.innerHTML = `
      <div class="lesson-error" role="alert">
        <h2>${txt('Could not load lesson', 'পাঠ লোড করা যায়নি')}</h2>
        <p>${esc(msg)}</p>
        <p><a href="home.html" class="btn btn--primary">${txt('Back to home', 'হোমে ফিরে যান')}</a></p>
      </div>
    `;
  }

  /* ─── Boot ──────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
