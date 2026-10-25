/* =========================================================
   Phase 8 — Quiz Engine
   - Question generators: practice / vocab / grammar / kanji
   - Types: mc, fib, match, listen
   - Timer: off | per-question | total
   - Scoring, explanations, review-mistakes, retry-wrong-only
   ========================================================= */
(function () {
  'use strict';

  // ---------------- Helpers ----------------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class')       n.className = v;
      else if (k === 'html')   n.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true)     n.setAttribute(k, '');
      else                     n.setAttribute(k, String(v));
    }
    for (const c of children) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }

  const txt = (en, bn) =>
    el('span', { 'data-en': en || '', 'data-bn': bn || '' }, en || '');

  const ruby = (base, rt) => {
    if (!rt || rt === base) return document.createTextNode(base || '');
    const r = document.createElement('ruby');
    r.appendChild(document.createTextNode(base));
    const t = document.createElement('rt');
    t.textContent = rt;
    r.appendChild(t);
    return r;
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = (arr, n) => shuffle(arr).slice(0, Math.max(0, n));
  const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const fmtTime = (s) => {
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  function optionText(o) {
    if (o == null) return document.createTextNode('');
    if (typeof o === 'string') return document.createTextNode(o);
    if (o.en !== undefined || o.bn !== undefined) return txt(o.en || '', o.bn || '');
    if (o.text_en !== undefined || o.text_bn !== undefined) return txt(o.text_en || '', o.text_bn || '');
    if (o.text !== undefined) return document.createTextNode(String(o.text));
    return document.createTextNode(String(o));
  }
  function optionPlainText(o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    if (o.en !== undefined) return o.en;
    if (o.text_en !== undefined) return o.text_en;
    if (o.text !== undefined) return o.text;
    return String(o);
  }

  // ---------------- Storage ----------------
  const KEY_PREFS   = 'nihongo_quiz_prefs';
  const KEY_HISTORY = 'nihongo_quiz_history';
  const KEY_LAST    = 'nihongo_quiz_last_lesson';

  const readJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); } catch { return fb; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // ---------------- TTS ----------------
  function speakJa(text, url) {
    if (!text) return;
    if (url) {
      const a = new Audio(url);
      a.play().catch(() => speakTts(text));
      return;
    }
    speakTts(text);
  }
  function speakTts(text) {
    if (!('speechSynthesis' in window)) return;
    const rate = Number(localStorage.getItem('nihongo_audio_rate')) || 1;
    try { speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = rate;
    speechSynthesis.speak(u);
  }

  // ---------------- Timer ----------------
  let timerHandle = null;
  let timerRemaining = 0;

  function startTimer(seconds, onTick, onExpire) {
    stopTimer();
    timerRemaining = seconds;
    if (onTick) onTick(timerRemaining);
    timerHandle = setInterval(() => {
      timerRemaining -= 1;
      if (onTick) onTick(timerRemaining);
      if (timerRemaining <= 0) {
        stopTimer();
        if (onExpire) onExpire();
      }
    }, 1000);
  }
  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  // ---------------- Question generators ----------------
  function generateQuestions(lesson, types) {
    const out = [];
    const vocab    = lesson.vocabulary || [];
    const kanji    = lesson.kanji || [];
    const practice = lesson.practice || [];

    // 1. Pre-made MC from practice.json
    if (types.includes('mc') && practice.length) {
      for (const p of practice) {
        if (p.type !== 'multiple-choice') continue;
        out.push({
          id: `p-${p.id}`,
          type: 'mc',
          source: 'practice',
          prompt: p.prompt || { en: 'Choose the correct answer', bn: 'সঠিক উত্তর বেছে নিন' },
          stem: p.stem || {},
          options: (p.options || []).map((o, i) => ({ ...o, __idx: i })),
          correctIndex: p.correctIndex,
          explanation: p.explanation || null,
          points: 1
        });
      }
    }

    // 2. Vocabulary → MC meaning
    if (types.includes('mc') && vocab.length >= 4) {
      const picks = pick(vocab, Math.min(5, vocab.length));
      for (const v of picks) {
        const others = shuffle(vocab.filter(x => x.id !== v.id)).slice(0, 3);
        if (others.length < 3) continue;
        const pool = shuffle([v, ...others]);
        out.push({
          id: `v-mc-${v.id}`,
          type: 'mc',
          source: 'vocab',
          prompt: { en: 'What does this mean?', bn: 'এর অর্থ কী?' },
          stem: { jp: v.kanji || v.furigana, furigana: v.furigana },
          options: pool.map(o => ({ en: o.english_meaning, bn: o.bengali_meaning })),
          correctIndex: pool.findIndex(o => o.id === v.id),
          explanation: v.romaji
            ? { en: `Reading: ${v.furigana} (${v.romaji})`, bn: `পাঠ: ${v.furigana} (${v.romaji})` }
            : null,
          points: 1
        });
      }
    }

    // 3. Kanji → MC meaning
    if (types.includes('mc') && kanji.length >= 4) {
      const picks = pick(kanji, Math.min(3, kanji.length));
      for (const k of picks) {
        const others = shuffle(kanji.filter(x => x.character !== k.character)).slice(0, 3);
        if (others.length < 3) continue;
        const pool = shuffle([k, ...others]);
        out.push({
          id: `k-mc-${k.character}`,
          type: 'mc',
          source: 'kanji',
          prompt: { en: 'What does this kanji mean?', bn: 'এই কাঞ্জির অর্থ কী?' },
          stem: { jp: k.character },
          options: pool.map(o => ({
            en: (o.meanings?.en || []).join(', '),
            bn: (o.meanings?.bn || []).join(', ')
          })),
          correctIndex: pool.findIndex(o => o.character === k.character),
          explanation: null,
          points: 1
        });
      }
    }

    // 4. Kanji → fill in the reading
    if (types.includes('fib') && kanji.length) {
      const picks = pick(kanji, Math.min(4, kanji.length));
      for (const k of picks) {
        const readings = [...(k.onyomi || []), ...(k.kunyomi || [])].filter(Boolean);
        if (!readings.length) continue;
        out.push({
          id: `k-fib-${k.character}`,
          type: 'fib',
          source: 'kanji',
          prompt: { en: 'Type one reading of this kanji', bn: 'এই কাঞ্জির একটি পাঠ টাইপ করুন' },
          stem: { jp: k.character },
          answer: { accept: readings.map(normalize), display: readings.join(' / ') },
          explanation: null,
          points: 1
        });
      }
    }

    // 5. Vocabulary → fill in the reading
    if (types.includes('fib') && vocab.length) {
      const withKanji = vocab.filter(v => v.kanji && v.furigana && v.kanji !== v.furigana);
      const picks = pick(withKanji, Math.min(4, withKanji.length));
      for (const v of picks) {
        const accept = [normalize(v.furigana)];
        if (v.romaji) accept.push(normalize(v.romaji));
        out.push({
          id: `v-fib-${v.id}`,
          type: 'fib',
          source: 'vocab',
          prompt: { en: 'Type the reading (hiragana or romaji)', bn: 'পাঠ (হিরাগানা বা রোমাজি) টাইপ করুন' },
          stem: {
            jp: v.kanji,
            meaning: { en: v.english_meaning, bn: v.bengali_meaning }
          },
          answer: { accept, display: v.furigana },
          explanation: null,
          points: 1
        });
      }
    }

    // 6. Vocabulary → listening
    if (types.includes('listen') && vocab.length >= 4) {
      const picks = pick(vocab, Math.min(4, vocab.length));
      for (const v of picks) {
        const others = shuffle(vocab.filter(x => x.id !== v.id)).slice(0, 3);
        if (others.length < 3) continue;
        const pool = shuffle([v, ...others]);
        out.push({
          id: `v-listen-${v.id}`,
          type: 'listen',
          source: 'vocab',
          prompt: { en: 'What did you hear?', bn: 'আপনি কী শুনলেন?' },
          stem: {},
          audio: { text: v.kanji || v.furigana, url: v.audio_url },
          options: pool.map(o => ({ en: o.english_meaning, bn: o.bengali_meaning })),
          correctIndex: pool.findIndex(o => o.id === v.id),
          explanation: {
            en: `It was 「${v.kanji || v.furigana}」 (${v.furigana})`,
            bn: `এটি ছিল 「${v.kanji || v.furigana}」 (${v.furigana})`
          },
          points: 1
        });
      }
    }

    // 7. Vocabulary → matching
    if (types.includes('match') && vocab.length >= 4) {
      const groups = Math.min(2, Math.floor(vocab.length / 4));
      const shuffledVocab = shuffle(vocab);
      for (let g = 0; g < groups; g++) {
        const chunk = shuffledVocab.slice(g * 4, g * 4 + 4);
        if (chunk.length < 4) break;
        out.push({
          id: `v-match-${g}`,
          type: 'match',
          source: 'vocab',
          prompt: { en: 'Match each Japanese word to its meaning', bn: 'প্রতিটি জাপানি শব্দের অর্থের সাথে মিলান' },
          pairs: chunk.map(v => ({
            leftId: v.id,
            left:  { jp: v.kanji || v.furigana, furigana: v.furigana },
            right: { en: v.english_meaning, bn: v.bengali_meaning }
          })),
          explanation: null,
          points: 1
        });
      }
    }

    return out;
  }

  // ---------------- State ----------------
  const state = {
    lessonRegistry: [],
    lessonSlug: null,
    lesson: null,
    setup: { types: ['mc', 'fib', 'match', 'listen'], countVal: 10, timerVal: 'off' },
    questions: [],
    answers: [],
    current: 0,
    startedAt: 0,
    perQuestionLimit: 0,
    totalTimeLimit: 0,
    currentMatchRatio: 0,
    resultData: null
  };

  const main = () => $('#quiz-main');

  // ---------------- Setup screen ----------------
  function renderSetup() {
    stopTimer();
    state.resultData = null;
    state.currentMatchRatio = 0;

    const prefs   = readJSON(KEY_PREFS, {});
    const history = readJSON(KEY_HISTORY, {});
    const lastSlug = localStorage.getItem(KEY_LAST) || prefs.lesson || state.lessonRegistry[0]?.slug;

    const root = main();
    root.innerHTML = '';

    const wrap = el('div', { class: 'quiz-setup' });

    wrap.appendChild(el('header', {},
      el('h1', { class: 'quiz-setup__title' }, txt('Quiz', 'কুইজ')),
      el('p', { class: 'quiz-setup__lead' }, txt(
        'Test yourself on vocabulary, kanji, grammar, and listening. Generated from the lesson data.',
        'শব্দভাণ্ডার, কাঞ্জি, ব্যাকরণ ও শ্রবণে নিজেকে পরীক্ষা করুন। পাঠের ডেটা থেকে তৈরি।'
      ))
    ));

    // Lesson select
    const lessonField = el('div', { class: 'quiz-field' },
      el('label', { class: 'quiz-field__label', for: 'quiz-lesson' }, txt('Lesson', 'পাঠ'))
    );
    const lessonSel = el('select', { id: 'quiz-lesson', class: 'select quiz-select' });
    for (const m of state.lessonRegistry) {
      const opt = el('option', { value: m.slug });
      opt.appendChild(txt(`Lesson ${m.lessonNumber}: ${m.title.en}`, `পাঠ ${m.lessonNumber}: ${m.title.bn}`));
      if (m.slug === lastSlug) opt.selected = true;
      lessonSel.appendChild(opt);
    }
    lessonField.appendChild(lessonSel);
    wrap.appendChild(lessonField);

    // Question types
    const typeDefs = [
      { key: 'mc',     en: 'Multiple choice',    bn: 'বহুনির্বাচনী' },
      { key: 'fib',    en: 'Fill in the blank',  bn: 'শূন্যস্থান পূরণ' },
      { key: 'match',  en: 'Matching',           bn: 'মিলকরণ' },
      { key: 'listen', en: 'Listening',          bn: 'শ্রবণ' }
    ];
    const selectedTypes = new Set(prefs.types || typeDefs.map(t => t.key));
    const typesField = el('div', { class: 'quiz-field' },
      el('div', { class: 'quiz-field__label' }, txt('Question types', 'প্রশ্নের ধরন'))
    );
    const typeRow = el('div', { class: 'quiz-choices' });
    for (const t of typeDefs) {
      const id = `type-${t.key}`;
      const choice = el('label', { class: 'quiz-choice', for: id });
      const input = el('input', { type: 'checkbox', id, value: t.key, class: 'quiz-choice__input' });
      if (selectedTypes.has(t.key)) input.checked = true;
      choice.appendChild(input);
      choice.appendChild(txt(t.en, t.bn));
      typeRow.appendChild(choice);
    }
    typesField.appendChild(typeRow);
    wrap.appendChild(typesField);

    // Count
    const countOpts = [5, 10, 20, 30, 0];
    const selCount = prefs.count ?? 10;
    const countField = el('div', { class: 'quiz-field' },
      el('div', { class: 'quiz-field__label' }, txt('How many questions?', 'কতটি প্রশ্ন?'))
    );
    const countRow = el('div', { class: 'quiz-choices quiz-choices--row' });
    for (const n of countOpts) {
      const choice = el('label', { class: 'quiz-choice quiz-choice--pill' });
      const input = el('input', { type: 'radio', name: 'q-count', value: String(n), class: 'quiz-choice__input' });
      if (n === selCount) input.checked = true;
      choice.appendChild(input);
      choice.appendChild(n === 0 ? txt('All', 'সব') : document.createTextNode(String(n)));
      countRow.appendChild(choice);
    }
    countField.appendChild(countRow);
    wrap.appendChild(countField);

    // Timer
    const timerOpts = [
      { key: 'off',   en: 'Off',                bn: 'বন্ধ' },
      { key: 'perq',  en: '30s per question',   bn: 'প্রতি প্রশ্নে ৩০ সে.' },
      { key: 'total', en: '5 min total',        bn: 'মোট ৫ মিনিট' }
    ];
    const selTimer = prefs.timer || 'off';
    const timerField = el('div', { class: 'quiz-field' },
      el('div', { class: 'quiz-field__label' }, txt('Timer', 'টাইমার'))
    );
    const timerRow = el('div', { class: 'quiz-choices quiz-choices--row' });
    for (const t of timerOpts) {
      const choice = el('label', { class: 'quiz-choice quiz-choice--pill' });
      const input = el('input', { type: 'radio', name: 'q-timer', value: t.key, class: 'quiz-choice__input' });
      if (t.key === selTimer) input.checked = true;
      choice.appendChild(input);
      choice.appendChild(txt(t.en, t.bn));
      timerRow.appendChild(choice);
    }
    timerField.appendChild(timerRow);
    wrap.appendChild(timerField);

    // Start
    const startBtn = el('button', { class: 'btn btn-primary btn-lg quiz-start', type: 'button' },
      txt('Start quiz', 'কুইজ শুরু করুন')
    );
    startBtn.addEventListener('click', () => {
      const types = Array.from(typeRow.querySelectorAll('input:checked')).map(i => i.value);
      if (!types.length) {
        alert('Select at least one question type.');
        return;
      }
      const countVal = Number(countRow.querySelector('input:checked')?.value || 10);
      const timerVal = timerRow.querySelector('input:checked')?.value || 'off';
      const slug = lessonSel.value;
      writeJSON(KEY_PREFS, { lesson: slug, types, count: countVal, timer: timerVal });
      localStorage.setItem(KEY_LAST, slug);
      startQuiz({ slug, types, countVal, timerVal });
    });
    wrap.appendChild(startBtn);

    // Last-attempt summary
    if (history[lastSlug]) {
      const h = history[lastSlug];
      wrap.appendChild(el('div', { class: 'quiz-history' },
        el('div', { class: 'quiz-history__label' }, txt('Last attempt', 'সর্বশেষ প্রচেষ্টা')),
        el('div', { class: 'quiz-history__row' },
          txt(`Last: ${h.last}%`, `শেষ: ${h.last}%`),
          txt(`· Best: ${h.best}%`, `· সেরা: ${h.best}%`),
          txt(`· Attempts: ${h.attempts}`, `· প্রচেষ্টা: ${h.attempts}`)
        )
      ));
    }

    root.appendChild(wrap);
  }

  // ---------------- Start quiz ----------------
  async function startQuiz(opts) {
    stopTimer();
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch {} }
    state.resultData = null;
    state.currentMatchRatio = 0;

    const { slug, types, countVal, timerVal, seedQuestions } = opts;
    state.setup = { types, countVal, timerVal };

    try {
      if (!seedQuestions) {
        state.lesson = await DataLoader.loadLesson(slug);
      }
      state.lessonSlug = slug;

      let questions = seedQuestions
        ? shuffle(seedQuestions)
        : shuffle(generateQuestions(state.lesson, types));

      if (!questions.length) {
        alert('No questions could be generated. Try more types or another lesson.');
        return;
      }
      if (!seedQuestions && countVal && countVal > 0) {
        questions = questions.slice(0, countVal);
      }

      state.questions = questions;
      state.answers = questions.map(() => ({ correct: false, earned: 0, given: null, locked: false, timedOut: false }));
      state.current = 0;
      state.startedAt = Date.now();
      state.totalTimeLimit = timerVal === 'total' ? 300 : 0;
      state.perQuestionLimit = timerVal === 'perq' ? 30 : 0;

      if (state.totalTimeLimit) {
        startTimer(state.totalTimeLimit, updateTimerDisplay, () => finishQuiz(true));
      }
      renderQuestion();
    } catch (err) {
      console.error(err);
      alert('Failed to load lesson data.');
    }
  }

  // ---------------- Render one question ----------------
  function renderQuestion() {
    const root = main();
    root.innerHTML = '';
    state.currentMatchRatio = 0;

    if (state.perQuestionLimit) {
      startTimer(state.perQuestionLimit, updateTimerDisplay, () => {
        if (!state.answers[state.current].locked) gradeCurrent(null, true);
      });
    }

    const q = state.questions[state.current];
    const total = state.questions.length;

    // Top bar
    const timerChip = el('div', { class: 'quiz-top__timer', id: 'quiz-timer' });
    if (!state.totalTimeLimit && !state.perQuestionLimit) timerChip.hidden = true;
    else timerChip.textContent = state.totalTimeLimit
      ? fmtTime(state.totalTimeLimit)
      : `${state.perQuestionLimit}s`;

    const earned = state.answers.reduce((s, a) => s + a.earned, 0);
    root.appendChild(el('div', { class: 'quiz-top' },
      el('div', { class: 'quiz-top__progress' },
        txt(`Question ${state.current + 1} of ${total}`, `প্রশ্ন ${state.current + 1}/${total}`)
      ),
      timerChip,
      el('div', { class: 'quiz-top__score' },
        txt(`Score: ${earned.toFixed(1)}`, `স্কোর: ${earned.toFixed(1)}`)
      )
    ));

    // Progress bar
    const bar = el('div', { class: 'progress__bar' });
    bar.style.width = `${((state.current + 1) / total) * 100}%`;
    root.appendChild(el('div', { class: 'progress quiz-progress' }, bar));

    // Card
    const card = el('div', { class: `quiz-card quiz-card--${q.type}` },
      el('div', { class: 'quiz-card__prompt' }, txt(q.prompt.en, q.prompt.bn))
    );

    if (q.type === 'mc' || q.type === 'listen')      renderMCBody(card, q);
    else if (q.type === 'fib')                       renderFibBody(card, q);
    else if (q.type === 'match')                     renderMatchBody(card, q);

    root.appendChild(card);

    // Feedback placeholder
    root.appendChild(el('div', { class: 'quiz-feedback', id: 'quiz-feedback', hidden: true }));

    // Footer
    const nextBtn = el('button', {
      class: 'btn btn-primary quiz-next',
      type: 'button',
      id: 'quiz-next',
      disabled: true
    }, state.current === total - 1 ? txt('Finish', 'শেষ করুন') : txt('Next', 'পরবর্তী'));
    nextBtn.addEventListener('click', () => {
      if (state.current < total - 1) {
        state.current += 1;
        renderQuestion();
      } else {
        finishQuiz(false);
      }
    });
    root.appendChild(el('div', { class: 'quiz-footer' }, nextBtn));
  }

  function updateTimerDisplay(remaining) {
    const chip = $('#quiz-timer');
    if (!chip) return;
    chip.hidden = false;
    chip.textContent = state.perQuestionLimit ? `${remaining}s` : fmtTime(remaining);
    chip.classList.toggle('quiz-top__timer--warn', remaining <= 10);
  }

  // ---------------- MC / Listening body ----------------
  function renderMCBody(card, q) {
    if (q.type === 'listen') {
      const playBtn = el('button', {
        class: 'btn btn-soft quiz-listen__btn',
        type: 'button',
        'data-aria-label-en': 'Play audio',
        'data-aria-label-bn': 'অডিও চালান'
      });
      playBtn.appendChild(txt('▶ Play audio', '▶ অডিও চালান'));
      playBtn.addEventListener('click', () => speakJa(q.audio.text, q.audio.url));
      card.appendChild(el('div', { class: 'quiz-listen' }, playBtn));
      // Try an auto-play after mount (may be blocked; the button is the fallback)
      setTimeout(() => speakJa(q.audio.text, q.audio.url), 350);
    } else if (q.stem && q.stem.jp) {
      const stemWrap = el('div', { class: 'quiz-stem' });
      if (q.stem.furigana) {
        stemWrap.appendChild(el('div', { class: 'quiz-stem__jp' }, ruby(q.stem.jp, q.stem.furigana)));
      } else {
        stemWrap.appendChild(el('div', { class: 'quiz-stem__jp' }, q.stem.jp));
      }
      if (q.stem.meaning) {
        stemWrap.appendChild(el('div', { class: 'quiz-stem__meaning' },
          txt(q.stem.meaning.en, q.stem.meaning.bn)));
      }
      card.appendChild(stemWrap);
    }

    const opts = el('div', { class: 'quiz-options' });
    q.options.forEach((o, idx) => {
      const btn = el('button', { class: 'quiz-option', type: 'button', 'data-index': idx },
        el('span', { class: 'quiz-option__label' }, String.fromCharCode(65 + idx)),
        el('span', { class: 'quiz-option__body' }, optionText(o))
      );
      btn.addEventListener('click', () => {
        if (state.answers[state.current].locked) return;
        gradeCurrent(idx, false);
      });
      opts.appendChild(btn);
    });
    card.appendChild(opts);
  }

  // ---------------- Fill-in-the-blank body ----------------
  function renderFibBody(card, q) {
    if (q.stem && (q.stem.jp || q.stem.meaning)) {
      const stemWrap = el('div', { class: 'quiz-stem' });
      if (q.stem.jp) {
        if (q.stem.furigana) stemWrap.appendChild(el('div', { class: 'quiz-stem__jp' }, ruby(q.stem.jp, q.stem.furigana)));
        else stemWrap.appendChild(el('div', { class: 'quiz-stem__jp' }, q.stem.jp));
      }
      if (q.stem.meaning) {
        stemWrap.appendChild(el('div', { class: 'quiz-stem__meaning' },
          txt(q.stem.meaning.en, q.stem.meaning.bn)));
      }
      card.appendChild(stemWrap);
    }

    const input = el('input', {
      type: 'text',
      class: 'input quiz-fib__input',
      id: 'quiz-fib-input',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'data-aria-label-en': 'Your answer',
      'data-aria-label-bn': 'আপনার উত্তর'
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!state.answers[state.current].locked) gradeCurrent(input.value, false);
      }
    });
    const checkBtn = el('button', { class: 'btn btn-primary quiz-fib__check', type: 'button' },
      txt('Check', 'যাচাই')
    );
    checkBtn.addEventListener('click', () => {
      if (!state.answers[state.current].locked) gradeCurrent(input.value, false);
    });
    card.appendChild(el('div', { class: 'quiz-fib' }, input, checkBtn));
    setTimeout(() => input.focus(), 60);
  }

  // ---------------- Matching body ----------------
  function renderMatchBody(card, q) {
    const leftItems  = q.pairs.map((p, i) => ({ id: p.leftId, left: p.left }));
    const rightItems = shuffle(q.pairs.map((p, i) => ({ id: p.leftId, right: p.right })));
    const matched = new Set();
    let selectedLeftId = null;

    const wrap = el('div', { class: 'quiz-match' });
    const leftCol  = el('div', { class: 'quiz-match__col' });
    const rightCol = el('div', { class: 'quiz-match__col' });

    leftItems.forEach(item => {
      const btn = el('button', { class: 'quiz-match__item', type: 'button', 'data-id': item.id });
      if (item.left.furigana) btn.appendChild(ruby(item.left.jp, item.left.furigana));
      else btn.textContent = item.left.jp;
      btn.addEventListener('click', () => {
        if (state.answers[state.current].locked || matched.has(item.id)) return;
        $$('.quiz-match__item--active', wrap).forEach(n => n.classList.remove('quiz-match__item--active'));
        btn.classList.add('quiz-match__item--active');
        selectedLeftId = item.id;
      });
      leftCol.appendChild(btn);
    });

    rightItems.forEach(item => {
      const btn = el('button', { class: 'quiz-match__item', type: 'button', 'data-id': item.id });
      btn.appendChild(txt(item.right.en, item.right.bn));
      btn.addEventListener('click', () => {
        if (state.answers[state.current].locked || matched.has(item.id) || !selectedLeftId) return;
        const leftBtn = leftCol.querySelector(`[data-id="${selectedLeftId}"]`);
        if (selectedLeftId === item.id) {
          leftBtn.classList.remove('quiz-match__item--active');
          leftBtn.classList.add('quiz-match__item--matched');
          btn.classList.add('quiz-match__item--matched');
          matched.add(item.id);
          selectedLeftId = null;
          state.currentMatchRatio = matched.size / q.pairs.length;
          if (matched.size === q.pairs.length) {
            gradeCurrent(true, false, { ratio: 1 });
          }
        } else {
          leftBtn.classList.add('quiz-match__item--wrong');
          btn.classList.add('quiz-match__item--wrong');
          setTimeout(() => {
            leftBtn.classList.remove('quiz-match__item--wrong', 'quiz-match__item--active');
            btn.classList.remove('quiz-match__item--wrong');
          }, 500);
          selectedLeftId = null;
        }
      });
      rightCol.appendChild(btn);
    });

    wrap.appendChild(leftCol);
    wrap.appendChild(rightCol);
    card.appendChild(wrap);
  }

  // ---------------- Grading ----------------
  function gradeCurrent(given, timedOut, meta) {
    const q = state.questions[state.current];
    const ans = state.answers[state.current];
    if (ans.locked) return;

    let correct = false;
    let earned = 0;

    if (timedOut) {
      // Partial credit only for matching
      if (q.type === 'match') {
        earned = Math.min(1, state.currentMatchRatio || 0);
        correct = earned >= 1;
      } else {
        earned = 0;
        correct = false;
      }
    } else if (q.type === 'mc' || q.type === 'listen') {
      correct = Number(given) === q.correctIndex;
      earned = correct ? 1 : 0;
    } else if (q.type === 'fib') {
      const g = normalize(given);
      correct = !!g && q.answer.accept.includes(g);
      earned = correct ? 1 : 0;
    } else if (q.type === 'match') {
      const ratio = meta?.ratio ?? (state.currentMatchRatio || 0);
      correct = ratio >= 1;
      earned = ratio;
    }

    ans.correct = correct;
    ans.earned = earned;
    ans.given = given;
    ans.locked = true;
    ans.timedOut = !!timedOut;

    showFeedback(q, correct, given, timedOut);

    const nextBtn = $('#quiz-next');
    if (nextBtn) nextBtn.disabled = false;
  }

  function showFeedback(q, correct, given, timedOut) {
    const fb = $('#quiz-feedback');
    if (!fb) return;
    fb.hidden = false;
    fb.innerHTML = '';
    fb.classList.toggle('quiz-feedback--correct', correct);
    fb.classList.toggle('quiz-feedback--wrong', !correct);

    const header = el('div', { class: 'quiz-feedback__header' });
    if (correct)         header.appendChild(txt('✓ Correct', '✓ সঠিক'));
    else if (timedOut)   header.appendChild(txt('⏱ Time’s up', '⏱ সময় শেষ'));
    else                 header.appendChild(txt('✗ Incorrect', '✗ ভুল'));
    fb.appendChild(header);

    const body = el('div', { class: 'quiz-feedback__body' });

    if (q.type === 'mc' || q.type === 'listen') {
      $$('.quiz-option').forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) btn.classList.add('quiz-option--correct');
        if (!correct && idx === Number(given) && idx !== q.correctIndex) {
          btn.classList.add('quiz-option--wrong');
        }
      });
      if (!correct) {
        body.appendChild(el('div', { class: 'quiz-feedback__answer' },
          txt('Correct answer: ', 'সঠিক উত্তর: '),
          optionText(q.options[q.correctIndex])
        ));
      }
    } else if (q.type === 'fib') {
      const input = $('#quiz-fib-input');
      if (input) {
        input.disabled = true;
        input.classList.add(correct ? 'quiz-fib__input--correct' : 'quiz-fib__input--wrong');
      }
      body.appendChild(el('div', { class: 'quiz-feedback__answer' },
        txt('Correct answer: ', 'সঠিক উত্তর: '),
        document.createTextNode(q.answer.display)
      ));
    } else if (q.type === 'match') {
      $$('.quiz-match__item').forEach(n => n.classList.add('quiz-match__item--matched'));
    }

    if (q.explanation) {
      body.appendChild(el('div', { class: 'quiz-feedback__explain' },
        txt(q.explanation.en, q.explanation.bn)
      ));
    }
    fb.appendChild(body);
  }

  // ---------------- Finish / results ----------------
  function finishQuiz(timedOut) {
    stopTimer();
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch {} }

    if (!state.resultData) {
      const total = state.questions.length;
      const earned = state.answers.reduce((s, a) => s + a.earned, 0);
      const pct = total ? Math.round((earned / total) * 100) : 0;
      const duration = Math.floor((Date.now() - state.startedAt) / 1000);
      const wrongIndices = state.answers.map((a, i) => !a.correct ? i : -1).filter(i => i >= 0);

      // History
      const hist = readJSON(KEY_HISTORY, {});
      const prev = hist[state.lessonSlug] || { best: 0, last: 0, attempts: 0 };
      hist[state.lessonSlug] = {
        best: Math.max(prev.best, pct),
        last: pct,
        attempts: prev.attempts + 1,
        lastAt: Date.now()
      };
      writeJSON(KEY_HISTORY, hist);

      // Per-type breakdown
      const byType = {};
      state.questions.forEach((q, i) => {
        if (!byType[q.type]) byType[q.type] = { earned: 0, total: 0 };
        byType[q.type].total  += 1;
        byType[q.type].earned += state.answers[i].earned;
      });

      state.resultData = { total, earned, pct, duration, wrongIndices, byType, timedOut };
    }

    showResults();
  }

  function showResults() {
    const { total, earned, pct, duration, wrongIndices, byType, timedOut } = state.resultData;
    const root = main();
    root.innerHTML = '';

    const wrap = el('div', { class: 'quiz-results' });
    wrap.appendChild(el('h1', { class: 'quiz-results__title' }, txt('Quiz complete', 'কুইজ সম্পন্ন')));
    if (timedOut) {
      wrap.appendChild(el('div', { class: 'quiz-results__note' },
        txt('Time ran out — remaining questions are marked wrong.', 'সময় শেষ — বাকি প্রশ্নগুলো ভুল হিসেবে গণ্য হয়েছে।')
      ));
    }

    wrap.appendChild(el('div', { class: 'quiz-score' },
      el('div', { class: 'quiz-score__value' }, `${pct}%`),
      el('div', { class: 'quiz-score__label' },
        txt(`${earned.toFixed(1)} / ${total} correct`, `${earned.toFixed(1)} / ${total} সঠিক`)
      ),
      el('div', { class: 'quiz-score__time' },
        txt(`Time: ${fmtTime(duration)}`, `সময়: ${fmtTime(duration)}`)
      )
    ));

    // Breakdown
    const typeLabels = {
      mc:     { en: 'Multiple choice',   bn: 'বহুনির্বাচনী' },
      fib:    { en: 'Fill in the blank', bn: 'শূন্যস্থান পূরণ' },
      match:  { en: 'Matching',          bn: 'মিলকরণ' },
      listen: { en: 'Listening',         bn: 'শ্রবণ' }
    };
    const breakdown = el('div', { class: 'quiz-breakdown' });
    for (const [t, b] of Object.entries(byType)) {
      const row = el('div', { class: 'quiz-breakdown__row' },
        el('span', { class: 'quiz-breakdown__label' }, txt(typeLabels[t].en, typeLabels[t].bn)),
        el('span', { class: 'quiz-breakdown__value' }, `${b.earned.toFixed(1)} / ${b.total}`)
      );
      breakdown.appendChild(row);
    }
    wrap.appendChild(breakdown);

    // Actions
    const actions = el('div', { class: 'quiz-actions' });

    if (wrongIndices.length) {
      const reviewBtn = el('button', { class: 'btn btn-secondary', type: 'button' },
        txt('Review mistakes', 'ভুল পর্যালোচনা')
      );
      reviewBtn.addEventListener('click', () => renderReview());
      actions.appendChild(reviewBtn);

      const retryWrongBtn = el('button', { class: 'btn btn-primary', type: 'button' },
        txt('Retry wrong only', 'শুধু ভুলগুলো আবার')
      );
      retryWrongBtn.addEventListener('click', () => {
        const wrongQs = wrongIndices.map(i => state.questions[i]);
        startQuiz({
          slug: state.lessonSlug,
          types: state.setup.types,
          countVal: state.setup.countVal,
          timerVal: state.setup.timerVal,
          seedQuestions: wrongQs
        });
      });
      actions.appendChild(retryWrongBtn);
    }

    const retryAllBtn = el('button', { class: 'btn btn-soft', type: 'button' },
      txt('Retry all', 'সব আবার')
    );
    retryAllBtn.addEventListener('click', () => {
      startQuiz({
        slug: state.lessonSlug,
        types: state.setup.types,
        countVal: state.setup.countVal,
        timerVal: state.setup.timerVal
      });
    });
    actions.appendChild(retryAllBtn);

    const newBtn = el('button', { class: 'btn btn-ghost', type: 'button' },
      txt('New quiz', 'নতুন কুইজ')
    );
    newBtn.addEventListener('click', renderSetup);
    actions.appendChild(newBtn);

    wrap.appendChild(actions);
    root.appendChild(wrap);
  }

  // ---------------- Review mistakes ----------------
  function renderReview() {
    const wrongIndices = state.resultData.wrongIndices;
    let idx = 0;
    const root = main();

    function draw() {
      root.innerHTML = '';
      const q = state.questions[wrongIndices[idx]];

      const wrap = el('div', { class: 'quiz-review' });
      wrap.appendChild(el('h1', { class: 'quiz-review__title' }, txt('Review mistakes', 'ভুল পর্যালোচনা')));
      wrap.appendChild(el('div', { class: 'quiz-review__progress' },
        txt(`Mistake ${idx + 1} of ${wrongIndices.length}`, `ভুল ${idx + 1}/${wrongIndices.length}`)
      ));

      const card = el('div', { class: 'quiz-card' },
        el('div', { class: 'quiz-card__prompt' }, txt(q.prompt.en, q.prompt.bn))
      );

      if (q.stem && (q.stem.jp || q.stem.meaning)) {
        const stemWrap = el('div', { class: 'quiz-stem' });
        if (q.stem.jp) {
          if (q.stem.furigana) stemWrap.appendChild(el('div', { class: 'quiz-stem__jp' }, ruby(q.stem.jp, q.stem.furigana)));
          else stemWrap.appendChild(el('div', { class: 'quiz-stem__jp' }, q.stem.jp));
        }
        if (q.stem.meaning) {
          stemWrap.appendChild(el('div', { class: 'quiz-stem__meaning' },
            txt(q.stem.meaning.en, q.stem.meaning.bn)));
        }
        card.appendChild(stemWrap);
      }

      if (q.type === 'listen' && q.audio) {
        const playBtn = el('button', { class: 'btn btn-soft quiz-listen__btn', type: 'button' },
          txt('▶ Play audio', '▶ অডিও চালান')
        );
        playBtn.addEventListener('click', () => speakJa(q.audio.text, q.audio.url));
        card.appendChild(el('div', { class: 'quiz-listen' }, playBtn));
      }

      let correctDisplay = '';
      if (q.type === 'mc' || q.type === 'listen') {
        correctDisplay = optionPlainText(q.options[q.correctIndex]);
      } else if (q.type === 'fib') {
        correctDisplay = q.answer.display;
      } else if (q.type === 'match') {
        correctDisplay = q.pairs.map(p => `${p.left.jp} — ${p.right.en || p.right.bn}`).join(' · ');
      }

      card.appendChild(el('div', { class: 'quiz-review__correct' },
        el('div', { class: 'quiz-review__label' }, txt('Correct answer', 'সঠিক উত্তর')),
        el('div', { class: 'quiz-review__value' }, correctDisplay)
      ));

      if (q.explanation) {
        card.appendChild(el('div', { class: 'quiz-review__explain' },
          el('div', { class: 'quiz-review__label' }, txt('Explanation', 'ব্যাখ্যা')),
          el('div', {}, txt(q.explanation.en, q.explanation.bn))
        ));
      }

      wrap.appendChild(card);

      const nav = el('div', { class: 'quiz-actions' });
      const prevBtn = el('button', { class: 'btn btn-ghost', type: 'button', disabled: idx === 0 },
        txt('← Previous', '← পূর্ববর্তী')
      );
      prevBtn.addEventListener('click', () => { if (idx > 0) { idx -= 1; draw(); } });
      nav.appendChild(prevBtn);

      const nextBtn = el('button', {
        class: 'btn btn-primary', type: 'button',
        disabled: idx === wrongIndices.length - 1
      }, txt('Next →', 'পরবর্তী →'));
      nextBtn.addEventListener('click', () => {
        if (idx < wrongIndices.length - 1) { idx += 1; draw(); }
      });
      nav.appendChild(nextBtn);
      wrap.appendChild(nav);

      const back = el('button', { class: 'btn btn-ghost quiz-review__back', type: 'button' },
        txt('← Back to results', '← ফলাফলে ফিরে যান')
      );
      back.addEventListener('click', () => showResults());
      wrap.appendChild(back);

      root.appendChild(wrap);
    }
    draw();
  }

  // ---------------- Global keyboard ----------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.matches('input, textarea, select, button')) {
      const next = $('#quiz-next');
      if (next && !next.disabled) next.click();
    }
  });

  // ---------------- Boot ----------------
  async function boot() {
    try {
      const course = await DataLoader.loadCourse();
      state.lessonRegistry = course.lessons || [];
      if (!state.lessonRegistry.length) {
        main().appendChild(el('div', { class: 'quiz-error' },
          txt('No lessons found.', 'কোনো পাঠ পাওয়া যায়নি।')
        ));
        return;
      }
      renderSetup();
    } catch (err) {
      console.error(err);
      main().appendChild(el('div', { class: 'quiz-error' },
        txt('Failed to load course data.', 'কোর্স ডেটা লোড করা যায়নি।')
      ));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
