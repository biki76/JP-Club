/* =========================================================
   Phase 9 — Kanji section
   - Grid with filters (JLPT / strokes / radical / search)
   - Detail: meanings, readings, radicals, examples,
     KanjiVG stroke animation, canvas writing practice
   - Kanji quiz (meaning→kanji, kanji→meaning, kanji→reading)
   Routes: kanji.html | kanji.html?char=日 | kanji.html?quiz=1
   ========================================================= */
(function () {
  'use strict';

  // ---------------- Helpers ----------------
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class')     n.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true)   n.setAttribute(k, '');
      else                   n.setAttribute(k, String(v));
    }
    for (const c of children) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }

  const txt = (en, bn) =>
    el('span', { 'data-en': en || '', 'data-bn': bn || '' }, en || '');

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = (arr, n) => shuffle(arr).slice(0, Math.max(0, n));

  // ---------------- Storage ----------------
  const KEY_PREFS = 'nihongo_kanji_prefs';
  const KEY_QUIZ  = 'nihongo_kanji_quiz_history';
  const readJSON  = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); } catch { return fb; } };
  const writeJSON = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // ---------------- KanjiVG ----------------
  const KANJIVG_BASE = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/';
  const strokeCache = new Map();

  function hexOf(char) {
    return char.codePointAt(0).toString(16).padStart(5, '0');
  }

  async function fetchStrokes(char) {
    if (strokeCache.has(char)) return strokeCache.get(char);
    let result = null;
    try {
      const res = await fetch(`${KANJIVG_BASE}${hexOf(char)}.svg`, { mode: 'cors' });
      if (res.ok) {
        const text = await res.text();
        result = parseStrokes(text);
      }
    } catch (_) { /* offline / blocked — fallback */ }
    strokeCache.set(char, result);
    return result;
  }

  function parseStrokes(svgText) {
    try {
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      if (doc.querySelector('parsererror')) return null;
      const all = Array.from(doc.querySelectorAll('path[id]'))
        .filter(p => /-s\d+$/.test(p.id))
        .map(p => ({ id: p.id, d: p.getAttribute('d') }));
      all.sort((a, b) => {
        const na = Number(a.id.match(/-s(\d+)$/)[1]);
        const nb = Number(b.id.match(/-s(\d+)$/)[1]);
        return na - nb;
      });
      return all.length ? all : null;
    } catch { return null; }
  }

  // ---------------- Data ----------------
  let allKanji = [];
  let allVocab = [];

  async function loadAll() {
    const course = await DataLoader.loadCourse();
    const manifests = course.lessons || [];
    const loaded = await Promise.all(
      manifests.map(m => DataLoader.loadLesson(m.slug).catch(() => null))
    );

    const seenK = new Map();
    for (let i = 0; i < loaded.length; i++) {
      const lesson = loaded[i];
      if (!lesson) continue;
      const manifest = manifests[i];

      if (lesson.kanji) {
        for (const k of lesson.kanji) {
          if (!seenK.has(k.character)) {
            seenK.set(k.character, Object.assign({}, k, {
              lessonSlug: lesson.slug,
              lessonNumber: manifest.lessonNumber
            }));
          }
        }
      }
      if (lesson.vocabulary) {
        for (const v of lesson.vocabulary) {
          allVocab.push(Object.assign({}, v, { lessonSlug: lesson.slug }));
        }
      }
    }

    allKanji = Array.from(seenK.values())
      .sort((a, b) => (a.strokes || 0) - (b.strokes || 0) || (a.character || '').localeCompare(b.character || ''));
  }

  function jlptOf(k) {
    if (k.jlpt == null) return '—';
    const s = String(k.jlpt);
    return /^N\d$/.test(s) ? s : `N${s}`;
  }

  function findExamples(char, limit = 8) {
    const out = [];
    for (const v of allVocab) {
      if (!v.kanji || !v.kanji.includes(char)) continue;
      out.push(v);
      if (out.length >= limit) break;
    }
    return out;
  }

  // ---------------- Router ----------------
  function readRoute() {
    const p = new URLSearchParams(location.search);
    if (p.get('char')) return { view: 'detail', char: p.get('char') };
    if (p.get('quiz')) return { view: 'quiz' };
    return { view: 'grid' };
  }

  function navigate(params) {
    const u = new URL(location.href);
    u.search = '';
    for (const k of Object.keys(params || {})) {
      const v = params[k];
      if (v != null) u.searchParams.set(k, v);
    }
    history.pushState({}, '', u);
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.addEventListener('popstate', render);

  // ---------------- Grid ----------------
  let gridObserver = null;

  function renderGrid() {
    const main = $('#kanji-main');
    main.innerHTML = '';

    const prefs = readJSON(KEY_PREFS, {
      jlpt: 'all', strokes: 'all', radical: 'all', search: ''
    });

    // Header
    main.appendChild(el('div', { class: 'kanji-header' },
      el('h1', { class: 'kanji-header__title' }, txt('Kanji', 'কাঞ্জি')),
      el('p', { class: 'kanji-header__lead' },
        txt(
          `${allKanji.length} characters across all lessons. Click any kanji to study it.`,
          `সব পাঠ মিলিয়ে ${allKanji.length}টি অক্ষর। শিখতে যেকোনো কাঞ্জিতে ক্লিক করুন।`
        )
      )
    ));

    // Quiz CTA
    const actions = el('div', { class: 'kanji-actions' });
    actions.appendChild(el('button', {
      class: 'btn btn-primary', type: 'button',
      onclick: () => navigate({ quiz: '1' })
    }, txt('Kanji quiz', 'কাঞ্জি কুইজ')));
    main.appendChild(actions);

    // Filters
    const filters = el('div', { class: 'kanji-filters' });

    const jlptSel = el('select', { class: 'select kanji-filter__select', 'data-aria-label-en': 'JLPT level', 'data-aria-label-bn': 'JLPT স্তর' });
    const jlptOpts = [
      { v: 'all', en: 'All levels', bn: 'সব স্তর' },
      { v: 'N5', en: 'N5', bn: 'N5' },
      { v: 'N4', en: 'N4', bn: 'N4' },
      { v: 'N3', en: 'N3', bn: 'N3' },
      { v: 'N2', en: 'N2', bn: 'N2' },
      { v: 'N1', en: 'N1', bn: 'N1' }
    ];
    for (const o of jlptOpts) {
      const opt = el('option', { value: o.v });
      opt.appendChild(txt(o.en, o.bn));
      if (prefs.jlpt === o.v) opt.selected = true;
      jlptSel.appendChild(opt);
    }
    filters.appendChild(jlptSel);

    const strokeSel = el('select', { class: 'select kanji-filter__select', 'data-aria-label-en': 'Stroke count', 'data-aria-label-bn': 'স্ট্রোক সংখ্যা' });
    const strokeOpts = [
      { v: 'all',   en: 'Any strokes',      bn: 'যেকোনো স্ট্রোক' },
      { v: '1-5',   en: '1–5 strokes',      bn: '১–৫ স্ট্রোক' },
      { v: '6-10',  en: '6–10 strokes',     bn: '৬–১০ স্ট্রোক' },
      { v: '11-15', en: '11–15 strokes',    bn: '১১–১৫ স্ট্রোক' },
      { v: '16+',   en: '16+ strokes',      bn: '১৬+ স্ট্রোক' }
    ];
    for (const o of strokeOpts) {
      const opt = el('option', { value: o.v });
      opt.appendChild(txt(o.en, o.bn));
      if (prefs.strokes === o.v) opt.selected = true;
      strokeSel.appendChild(opt);
    }
    filters.appendChild(strokeSel);

    const radicalSel = el('select', { class: 'select kanji-filter__select', 'data-aria-label-en': 'Radical', 'data-aria-label-bn': 'রেডিক্যাল' });
    radicalSel.appendChild(el('option', { value: 'all' }, ''));
    radicalSel.firstChild.appendChild(txt('Any radical', 'যেকোনো রেডিক্যাল'));
    const radicals = Array.from(new Set(allKanji.flatMap(k => k.radicals || []))).sort();
    for (const r of radicals) {
      const opt = el('option', { value: r }, r);
      if (prefs.radical === r) opt.selected = true;
      radicalSel.appendChild(opt);
    }
    filters.appendChild(radicalSel);

    const search = el('input', {
      type: 'search', class: 'input kanji-filter__search',
      'data-placeholder-en': 'Search meaning or character…',
      'data-placeholder-bn': 'অর্থ বা অক্ষর খুঁজুন…',
      'data-aria-label-en': 'Search kanji',
      'data-aria-label-bn': 'কাঞ্জি খুঁজুন'
    });
    search.value = prefs.search || '';
    filters.appendChild(search);

    main.appendChild(filters);

    // Grid + empty state
    const grid = el('div', { class: 'kanji-grid' });
    main.appendChild(grid);

    const empty = el('div', { class: 'kanji-empty' },
      txt('No kanji match these filters.', 'এই ফিল্টারগুলোতে কোনো কাঞ্জি নেই।')
    );
    empty.hidden = true;
    main.appendChild(empty);

    function apply() {
      writeJSON(KEY_PREFS, {
        jlpt: jlptSel.value,
        strokes: strokeSel.value,
        radical: radicalSel.value,
        search: search.value
      });

      const q = search.value.trim().toLowerCase();
      const filtered = allKanji.filter(k => {
        if (jlptSel.value !== 'all' && jlptOf(k) !== jlptSel.value) return false;
        if (radicalSel.value !== 'all' && !(k.radicals || []).includes(radicalSel.value)) return false;

        if (strokeSel.value !== 'all') {
          const s = k.strokes || 0;
          if (strokeSel.value === '1-5'   && !(s >= 1  && s <= 5))  return false;
          if (strokeSel.value === '6-10'  && !(s >= 6  && s <= 10)) return false;
          if (strokeSel.value === '11-15' && !(s >= 11 && s <= 15)) return false;
          if (strokeSel.value === '16+'   && !(s >= 16))            return false;
        }

        if (q) {
          const hay = [
            k.character,
            ...(k.meanings?.en || []),
            ...(k.meanings?.bn || []),
            ...(k.onyomi || []),
            ...(k.kunyomi || []),
            ...(k.radicals || [])
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      grid.innerHTML = '';
      empty.hidden = filtered.length > 0;

      for (const k of filtered) {
        const card = el('a', {
          href: `kanji.html?char=${encodeURIComponent(k.character)}`,
          class: 'kanji-grid__card',
          'data-aria-label-en': `${k.character} — ${(k.meanings?.en || []).join(', ')}`,
          'data-aria-label-bn': `${k.character} — ${(k.meanings?.bn || []).join(', ')}`
        });
        card.addEventListener('click', (e) => {
          e.preventDefault();
          navigate({ char: k.character });
        });
        card.appendChild(el('span', { class: 'kanji-grid__char' }, k.character));
        card.appendChild(el('span', { class: 'kanji-grid__meanings' },
          txt((k.meanings?.en || []).slice(0, 2).join(', '),
              (k.meanings?.bn || []).slice(0, 2).join(', '))
        ));
        card.appendChild(el('span', { class: 'kanji-grid__meta' },
          el('span', { class: 'badge badge-outline' }, jlptOf(k)),
          el('span', { class: 'kanji-grid__strokes' }, `${k.strokes || '?'} ○`)
        ));
        grid.appendChild(card);
      }
    }

    jlptSel.addEventListener('change', apply);
    strokeSel.addEventListener('change', apply);
    radicalSel.addEventListener('change', apply);
    search.addEventListener('input', () => {
      clearTimeout(search._t);
      search._t = setTimeout(apply, 120);
    });

    // Bilingual placeholder swap
    function updatePlaceholder() {
      const lang = document.documentElement.getAttribute('lang') || 'en';
      search.placeholder = search.getAttribute(lang === 'bn' ? 'data-placeholder-bn' : 'data-placeholder-en') || '';
    }
    updatePlaceholder();
    if (gridObserver) gridObserver.disconnect();
    gridObserver = new MutationObserver(updatePlaceholder);
    gridObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    apply();
  }

  // ---------------- Detail ----------------
  async function renderDetail(char) {
    const main = $('#kanji-main');
    main.innerHTML = '';

    const k = allKanji.find(x => x.character === char);
    if (!k) {
      main.appendChild(el('div', { class: 'kanji-empty' },
        txt('Kanji not found in the current lessons.', 'বর্তমান পাঠে কাঞ্জিটি পাওয়া যায়নি।')
      ));
      main.appendChild(el('button', {
        class: 'btn btn-secondary', type: 'button',
        onclick: () => navigate({})
      }, txt('← Back to grid', '← গ্রিডে ফিরে যান')));
      return;
    }

    // Back link
    const back = el('a', { class: 'kanji-back', href: 'kanji.html' },
      txt('← All kanji', '← সব কাঞ্জি'));
    back.addEventListener('click', (e) => { e.preventDefault(); navigate({}); });
    main.appendChild(back);

    // Hero
    const hero = el('div', { class: 'kanji-hero' });

    const strokeBox = el('div', { class: 'kanji-stroke' },
      el('div', { class: 'kanji-stroke__placeholder' }, '…')
    );
    hero.appendChild(strokeBox);

    const info = el('div', { class: 'kanji-info' });
    info.appendChild(el('div', { class: 'kanji-info__char' }, char));
    info.appendChild(el('div', { class: 'kanji-info__meanings' },
      txt((k.meanings?.en || []).join(', '), (k.meanings?.bn || []).join(', '))
    ));

    const metaRow = el('div', { class: 'kanji-info__meta' });
    metaRow.appendChild(el('span', { class: 'badge badge-primary' }, jlptOf(k)));
    metaRow.appendChild(el('span', { class: 'badge badge-outline' }, `${k.strokes || '?'} strokes`));
    if (k.grade) metaRow.appendChild(el('span', { class: 'badge badge-outline' }, `Grade ${k.grade}`));
    info.appendChild(metaRow);

    if ((k.onyomi || []).length) {
      info.appendChild(el('div', { class: 'kanji-readings' },
        el('div', { class: 'kanji-readings__label' }, txt('On’yomi', 'অন-ইয়োমি')),
        el('div', { class: 'kanji-readings__values' }, (k.onyomi || []).join('、'))
      ));
    }
    if ((k.kunyomi || []).length) {
      info.appendChild(el('div', { class: 'kanji-readings' },
        el('div', { class: 'kanji-readings__label' }, txt('Kun’yomi', 'কুন-ইয়োমি')),
        el('div', { class: 'kanji-readings__values' }, (k.kunyomi || []).join('、'))
      ));
    }
    if ((k.radicals || []).length) {
      info.appendChild(el('div', { class: 'kanji-readings' },
        el('div', { class: 'kanji-readings__label' }, txt('Radicals', 'রেডিক্যাল')),
        el('div', { class: 'kanji-readings__values' }, (k.radicals || []).join(' · '))
      ));
    }

    if (k.lessonSlug) {
      info.appendChild(el('a', {
        class: 'kanji-info__lesson',
        href: `lesson.html?lesson=${encodeURIComponent(k.lessonSlug)}#kanji`
      }, txt(`From Lesson ${k.lessonNumber}`, `পাঠ ${k.lessonNumber} থেকে`)));
    }

    hero.appendChild(info);
    main.appendChild(hero);

    // Stroke animation (async, with fallback)
    const paths = await fetchStrokes(char);
    if (!document.body.contains(main)) return; // navigated away
    initStrokeAnimation(strokeBox, paths, char);

    // Writing practice
    const practiceHead = el('div', {},
      el('h2', { class: 'kanji-section-title' }, txt('Writing practice', 'লেখার অনুশীলন')),
      el('p', { class: 'kanji-section-lead' },
        txt(
          'Trace the character below with your mouse, stylus, or finger.',
          'নিচে ইঁদুর, স্টাইলাস বা আঙুল দিয়ে অক্ষরটি আঁকুন।'
        )
      )
    );
    main.appendChild(practiceHead);
    initPracticeCanvas(main, char);

    // Examples
    const examples = findExamples(char, 8);
    if (examples.length) {
      main.appendChild(el('h2', { class: 'kanji-section-title' },
        txt('Example words', 'উদাহরণ শব্দ')
      ));
      const exGrid = el('div', { class: 'kanji-examples__grid' });
      for (const v of examples) {
        exGrid.appendChild(el('div', { class: 'kanji-example' },
          el('div', { class: 'kanji-example__jp' }, v.kanji || v.furigana || ''),
          el('div', { class: 'kanji-example__reading' }, v.furigana || ''),
          el('div', { class: 'kanji-example__meaning' },
            txt(v.english_meaning || '', v.bengali_meaning || '')
          )
        ));
      }
      main.appendChild(exGrid);
    }
  }

  // ---------------- Stroke animation ----------------
  function initStrokeAnimation(container, paths, char) {
    container.innerHTML = '';

    if (!paths) {
      container.appendChild(el('div', { class: 'kanji-stroke__fallback' }, char));
      container.appendChild(el('div', { class: 'kanji-stroke__note' },
        txt(
          'Stroke-order data is unavailable right now — connect to the internet to replay the animation.',
          'স্ট্রোক-ক্রমের ডেটা এই মুহূর্তে পাওয়া যাচ্ছে না — অ্যানিমেশন দেখতে ইন্টারনেটে সংযুক্ত হন।'
        )
      ));
      return;
    }

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 109 109');
    svg.setAttribute('class', 'kanji-stroke__svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${char} stroke order — ${paths.length} strokes`);

    // Guides
    const gridG = document.createElementNS(NS, 'g');
    gridG.setAttribute('class', 'kanji-stroke__grid');
    const mkLine = (x1, y1, x2, y2) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      return l;
    };
    gridG.appendChild(mkLine(54.5, 0, 54.5, 109));
    gridG.appendChild(mkLine(0, 54.5, 109, 54.5));
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', '0.5'); rect.setAttribute('y', '0.5');
    rect.setAttribute('width', '108'); rect.setAttribute('height', '108');
    gridG.appendChild(rect);
    svg.appendChild(gridG);

    // Stroke paths
    const pathsG = document.createElementNS(NS, 'g');
    pathsG.setAttribute('fill', 'none');
    pathsG.setAttribute('stroke', 'currentColor');
    pathsG.setAttribute('stroke-width', '3');
    pathsG.setAttribute('stroke-linecap', 'round');
    pathsG.setAttribute('stroke-linejoin', 'round');

    const pathEls = [];
    paths.forEach((p, i) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', p.d);
      path.setAttribute('id', `stroke-${i + 1}`);
      pathsG.appendChild(path);
      pathEls.push(path);
    });
    svg.appendChild(pathsG);
    container.appendChild(svg);

    const lengths = pathEls.map(p => p.getTotalLength());

    function reset() {
      pathEls.forEach((p, i) => {
        p.style.transition = 'none';
        p.style.strokeDasharray = `${lengths[i]}`;
        p.style.strokeDashoffset = `${lengths[i]}`;
      });
      // force reflow so transitions restart
      void svg.getBoundingClientRect();
    }

    function play() {
      reset();
      const dur = 380;
      pathEls.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${dur}ms linear`;
        p.style.transitionDelay = `${i * dur}ms`;
        p.style.strokeDashoffset = '0';
      });
    }

    // Replay control
    const controls = el('div', { class: 'kanji-stroke__controls' });
    controls.appendChild(el('button', {
      class: 'btn btn-soft btn-sm', type: 'button', onclick: play
    }, txt('↻ Replay', '↻ আবার')));
    container.appendChild(controls);

    // Play on first visible
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        play();
      }
    }, { threshold: 0.2 });
    io.observe(svg);
  }

  // ---------------- Writing practice canvas ----------------
  function initPracticeCanvas(parent, char) {
    const wrap = el('div', { class: 'kanji-practice__wrap' });
    const canvas = el('canvas', {
      class: 'kanji-practice__canvas',
      'data-aria-label-en': `Practice writing ${char}`,
      'data-aria-label-bn': `${char} লেখার অনুশীলন`,
      tabindex: '0'
    });
    wrap.appendChild(canvas);
    parent.appendChild(wrap);

    const controls = el('div', { class: 'kanji-practice__controls' });

    const guideLabel = el('label', { class: 'kanji-practice__guide-toggle' });
    const guideCb = el('input', { type: 'checkbox', checked: true });
    guideLabel.appendChild(guideCb);
    guideLabel.appendChild(txt('Show guide', 'গাইড দেখান'));
    controls.appendChild(guideLabel);

    const undoBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button' },
      txt('Undo', 'ফিরিয়ে নিন'));
    controls.appendChild(undoBtn);

    const clearBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button' },
      txt('Clear', 'মুছুন'));
    controls.appendChild(clearBtn);

    parent.appendChild(controls);

    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let size = 0;
    const strokes = [];
    let current = null;
    let drawing = false;
    let showGuide = true;

    function readVar(name, fallback) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      size = Math.max(180, Math.min(rect.width || 360, 420));
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, size, size);

      // Grid
      ctx.save();
      ctx.strokeStyle = readVar('--border', '#ccc');
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      const half = size / 2;
      ctx.beginPath();
      ctx.moveTo(half, 0); ctx.lineTo(half, size);
      ctx.moveTo(0, half); ctx.lineTo(size, half);
      ctx.stroke();
      ctx.restore();

      // Faint guide character
      if (showGuide) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = readVar('--ink', '#000');
        ctx.font = `${Math.round(size * 0.82)}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, size / 2, size / 2 + size * 0.03);
        ctx.restore();
      }

      // Strokes
      ctx.save();
      ctx.strokeStyle = readVar('--primary', '#3556c9');
      ctx.lineWidth = Math.max(3, size * 0.018);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const paint = (pts) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      };
      for (const s of strokes) paint(s);
      if (current) paint(current);
      ctx.restore();
    }

    function pointFromEvent(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      current = [pointFromEvent(e)];
      draw();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      e.preventDefault();
      current.push(pointFromEvent(e));
      draw();
    });
    const finish = (e) => {
      if (!drawing) return;
      drawing = false;
      if (current && current.length > 1) strokes.push(current);
      current = null;
      draw();
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);

    clearBtn.addEventListener('click', () => {
      strokes.length = 0;
      current = null;
      draw();
    });
    undoBtn.addEventListener('click', () => {
      strokes.pop();
      draw();
    });
    guideCb.addEventListener('change', () => {
      showGuide = guideCb.checked;
      draw();
    });

    new ResizeObserver(resize).observe(canvas);
    requestAnimationFrame(resize);

    // Redraw on theme change
    new MutationObserver(draw).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme']
    });
  }

  // ---------------- Quiz ----------------
  function renderQuiz() {
    const main = $('#kanji-main');
    main.innerHTML = '';

    const pool = allKanji.filter(k =>
      (k.meanings?.en || []).length &&
      ((k.onyomi || []).length + (k.kunyomi || []).length) > 0
    );

    if (pool.length < 4) {
      main.appendChild(el('div', { class: 'kanji-empty' },
        txt('Not enough kanji to build a quiz.', 'কুইজ তৈরির জন্য যথেষ্ট কাঞ্জি নেই।')
      ));
      main.appendChild(el('button', {
        class: 'btn btn-secondary', type: 'button', onclick: () => navigate({})
      }, txt('← Back', '← ফিরে যান')));
      return;
    }

    const totalQ = Math.min(10, pool.length);
    const chosen = pick(pool, totalQ);
    const questions = [];

    for (const k of chosen) {
      const type = ['meaning-to-kanji', 'kanji-to-meaning', 'kanji-to-reading'][
        Math.floor(Math.random() * 3)
      ];

      if (type === 'meaning-to-kanji') {
        const others = pick(pool.filter(x => x.character !== k.character), 3);
        if (others.length < 3) continue;
        const opts = shuffle([k, ...others]);
        questions.push({
          type,
          prompt: { en: 'Which kanji means this?', bn: 'কোন কাঞ্জির অর্থ এটি?' },
          stem: {
            en: (k.meanings?.en || []).join(', '),
            bn: (k.meanings?.bn || []).join(', ')
          },
          options: opts.map(o => o.character),
          correctIndex: opts.findIndex(o => o.character === k.character),
          _char: k.character
        });
      } else if (type === 'kanji-to-meaning') {
        const others = pick(pool.filter(x => x.character !== k.character), 3);
        if (others.length < 3) continue;
        const opts = shuffle([k, ...others]);
        questions.push({
          type,
          prompt: { en: 'What does this kanji mean?', bn: 'এই কাঞ্জির অর্থ কী?' },
          stem: { char: k.character },
          options: opts.map(o => ({
            en: (o.meanings?.en || []).join(', '),
            bn: (o.meanings?.bn || []).join(', ')
          })),
          correctIndex: opts.findIndex(o => o.character === k.character),
          _char: k.character
        });
      } else {
        const readings = [...(k.onyomi || []), ...(k.kunyomi || [])].filter(Boolean);
        if (!readings.length) continue;
        const correct = readings[Math.floor(Math.random() * readings.length)];
        const distractors = [];
        for (const other of pool) {
          if (other.character === k.character) continue;
          const r = [...(other.onyomi || []), ...(other.kunyomi || [])];
          if (r.length) distractors.push(r[Math.floor(Math.random() * r.length)]);
        }
        const opts = shuffle([correct, ...pick(distractors, 3)]);
        if (opts.length < 4) continue;
        questions.push({
          type,
          prompt: { en: 'Which is a reading of this kanji?', bn: 'নিচের কোনটি এই কাঞ্জির পাঠ?' },
          stem: { char: k.character },
          options: opts,
          correctIndex: opts.indexOf(correct),
          _char: k.character
        });
      }
    }

    if (!questions.length) {
      main.appendChild(el('div', { class: 'kanji-empty' },
        txt('Could not generate questions.', 'প্রশ্ন তৈরি করা যায়নি।')
      ));
      return;
    }

    const answers = questions.map(() => ({ given: null, correct: false, locked: false }));
    let current = 0;

    function draw() {
      main.innerHTML = '';
      const q = questions[current];
      const ans = answers[current];
      const score = answers.filter(a => a.correct).length;

      main.appendChild(el('div', { class: 'kanji-quiz__top' },
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => navigate({}) },
          txt('← Exit', '← প্রস্থান')
        ),
        el('span', { class: 'kanji-quiz__counter' }, `${current + 1} / ${questions.length}`),
        el('span', { class: 'kanji-quiz__score' },
          txt(`Score: ${score}`, `স্কোর: ${score}`))
      ));

      const bar = el('div', { class: 'progress__bar' });
      bar.style.width = `${(current / questions.length) * 100}%`;
      main.appendChild(el('div', { class: 'kanji-quiz__progress' }, bar));

      const card = el('div', { class: 'kanji-quiz__card' },
        el('div', { class: 'kanji-quiz__prompt' }, txt(q.prompt.en, q.prompt.bn))
      );

      if (q.stem.char) {
        card.appendChild(el('div', { class: 'kanji-quiz__stem-char' }, q.stem.char));
      } else if (q.stem.en || q.stem.bn) {
        card.appendChild(el('div', { class: 'kanji-quiz__stem-text' },
          txt(q.stem.en, q.stem.bn)));
      }

      const opts = el('div', { class: 'kanji-quiz__options' });
      q.options.forEach((o, i) => {
        const btn = el('button', { class: 'kanji-quiz__option', type: 'button' });
        if (q.type === 'meaning-to-kanji') {
          btn.classList.add('kanji-quiz__option--char');
          btn.textContent = o;
        } else if (typeof o === 'string') {
          btn.textContent = o;
        } else {
          btn.appendChild(txt(o.en, o.bn));
        }
        btn.addEventListener('click', () => {
          if (ans.locked) return;
          ans.given = i;
          ans.correct = i === q.correctIndex;
          ans.locked = true;
          $$('.kanji-quiz__option', opts).forEach((b, j) => {
            b.disabled = true;
            if (j === q.correctIndex) b.classList.add('kanji-quiz__option--correct');
            else if (j === i) b.classList.add('kanji-quiz__option--wrong');
          });
          setTimeout(() => {
            if (current < questions.length - 1) {
              current += 1;
              draw();
            } else {
              drawResults();
            }
          }, 720);
        });
        opts.appendChild(btn);
      });
      card.appendChild(opts);
      main.appendChild(card);
    }

    function drawResults() {
      main.innerHTML = '';
      const correct = answers.filter(a => a.correct).length;
      const pct = Math.round((correct / questions.length) * 100);

      const hist = readJSON(KEY_QUIZ, { best: 0, attempts: 0 });
      hist.best = Math.max(hist.best || 0, pct);
      hist.last = pct;
      hist.attempts = (hist.attempts || 0) + 1;
      writeJSON(KEY_QUIZ, hist);

      main.appendChild(el('div', { class: 'kanji-quiz__results' },
        el('h1', { class: 'kanji-quiz__results-title' }, txt('Quiz complete', 'কুইজ সম্পন্ন')),
        el('div', { class: 'kanji-quiz__results-score' }, `${pct}%`),
        el('div', { class: 'kanji-quiz__results-sub' },
          txt(`${correct} / ${questions.length} correct`, `${correct} / ${questions.length} সঠিক`)
        ),
        el('div', { class: 'kanji-quiz__results-best' },
          txt(`Best: ${hist.best}% · Attempts: ${hist.attempts}`, `সেরা: ${hist.best}% · প্রচেষ্টা: ${hist.attempts}`)
        ),
        el('div', { class: 'kanji-quiz__results-actions' },
          el('button', { class: 'btn btn-primary', type: 'button', onclick: renderQuiz },
            txt('Retry quiz', 'আবার শুরু')),
          el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => navigate({}) },
            txt('Back to grid', 'গ্রিডে ফিরে যান'))
        )
      ));
    }

    draw();
  }

  // ---------------- Render router ----------------
  function render() {
    const route = readRoute();
    if (route.view === 'detail') return renderDetail(route.char);
    if (route.view === 'quiz')   return renderQuiz();
    return renderGrid();
  }

  // ---------------- Boot ----------------
  async function boot() {
    const main = $('#kanji-main');
    main.appendChild(el('div', { class: 'kanji-loading' },
      txt('Loading kanji…', 'কাঞ্জি লোড হচ্ছে…')
    ));
    try {
      await loadAll();
      render();
    } catch (err) {
      console.error(err);
      main.innerHTML = '';
      main.appendChild(el('div', { class: 'kanji-empty' },
        txt('Failed to load kanji data.', 'কাঞ্জি ডেটা লোড করা যায়নি।')
      ));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
