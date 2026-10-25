/* ==========================================================================
   home.js — Home page (Phase 3)

   Renders:
     - continue-learning card (reads localStorage "nihongo_progress")
     - 6 textbook cards
     - JLPT N5–N1 strip
     - 3 "choose your path" cards

   Progress shape stored under localStorage['nihongo_progress']:
     {
       courseId: "minna-beginner",
       totalLessons: 50,
       completedLessons: 11,
       currentLesson: 12,
       currentLessonTitle: { en: "…", bn: "…" },
       currentLessonProgress: 0.34,   // 0..1
       updatedAt: 1729000000
     }

   Console helpers:
     Home.seedDemoProgress()  → writes a sample progress record
     Home.clearProgress()     → removes it
   ========================================================================== */

(function () {
  'use strict';

  const PROGRESS_KEY = 'nihongo_progress';

  /* -------------------------------------------------------------- Data -- */
  const BOOKS = [
    {
      id: 'minna-beginner',
      icon: '初',
      tone: 'primary',
      title: { en: 'Minna no Nihongo — Beginner', bn: 'মিন্না নো নিহোঙ্গো — বিগিনার' },
      subtitle: { en: 'Lessons 1–25 · N5', bn: 'লেসন ১–২৫ · N5' },
      desc: {
        en: 'The classic N5 course: grammar, vocabulary, reading and listening, explained in Bengali.',
        bn: 'ক্লাসিক N5 কোর্স: গ্রামার, শব্দভান্ডার, রিডিং ও লিসেনিং — বাংলায় ব্যাখ্যা।',
      },
      levels: ['N5'],
      href: '#lessons-n5',
    },
    {
      id: 'minna-intermediate',
      icon: '中',
      tone: 'primary',
      title: { en: 'Minna no Nihongo — Intermediate', bn: 'মিন্না নো নিহোঙ্গো — ইন্টারমিডিয়েট' },
      subtitle: { en: 'Lessons 26–50 · N4', bn: 'লেসন ২৬–৫০ · N4' },
      desc: {
        en: 'Continue after N5 with longer passages, more kanji, and natural spoken Japanese.',
        bn: 'N5-এর পরে আরও দীর্ঘ পাঠ, বেশি কাঞ্জি এবং স্বাভাবিক কথ্য জাপানিজ।',
      },
      levels: ['N4'],
      href: '#lessons-n4',
    },
    {
      id: 'temabetsu',
      icon: '別',
      tone: 'accent',
      title: { en: 'Temabetsu — Thematic Reader', bn: 'তেমাবেতসু — থিমেটিক রিডার' },
      subtitle: { en: 'Reading by topic · N4 → N3', bn: 'বিষয়ভিত্তিক রিডিং · N4 → N3' },
      desc: {
        en: 'Build reading speed on real-life topics: work, travel, health, news and daily life.',
        bn: 'বাস্তব জীবনের বিষয় — কাজ, ভ্রমণ, স্বাস্থ্য, সংবাদ, দৈনন্দিন — নিয়ে রিডিং গতি গড়ুন।',
      },
      levels: ['N4', 'N3'],
      href: '#temabetsu',
    },
    {
      id: 'mimikara',
      icon: '耳',
      tone: 'success',
      title: { en: 'Mimikara Oboeru — Vocabulary', bn: 'মিমিকারা ওবোয়েরু — শব্দভান্ডার' },
      subtitle: { en: 'Learn words by sound · N5 → N3', bn: 'শব্দ শিখুন শোনার মাধ্যমে · N5 → N3' },
      desc: {
        en: 'Vocabulary grouped by sound and use — designed for memory retention, not rote lists.',
        bn: 'শব্দ ও প্রয়োগ অনুযায়ী গোষ্ঠীবদ্ধ শব্দভান্ডার — মুখস্থ নয়, মনে রাখার জন্য।',
      },
      levels: ['N5', 'N4', 'N3'],
      href: '#mimikara',
    },
    {
      id: 'shin-kanzen',
      icon: '全',
      tone: 'warn',
      title: { en: 'Shin Kanzen Master', bn: 'শিন কানজেন মাস্টার' },
      subtitle: { en: 'Grammar, reading, listening · N3', bn: 'গ্রামার, রিডিং, লিসেনিং · N3' },
      desc: {
        en: 'The gold-standard exam prep. Full JLPT-format practice with Bengali explanations.',
        bn: 'সেরা পরীক্ষা-প্রস্তুতি। JLPT ফরম্যাটে পূর্ণ অনুশীলন — বাংলা ব্যাখ্যাসহ।',
      },
      levels: ['N3'],
      href: '#shin-kanzen',
    },
    {
      id: 'kanji-look-learn',
      icon: '漢',
      tone: 'primary',
      title: { en: 'Kanji Look and Learn', bn: 'কাঞ্জি লুক অ্যান্ড লার্ন' },
      subtitle: { en: '512 kanji with pictures · N5 → N3', bn: 'ছবিসহ ৫১২ কাঞ্জি · N5 → N3' },
      desc: {
        en: 'Every kanji drawn, dissected, and remembered through a picture — with readings and Bengali meanings.',
        bn: 'প্রতিটি কাঞ্জি আঁকা, বিশ্লেষণ করা এবং ছবির মাধ্যমে মনে রাখা — রিডিং ও বাংলা অর্থসহ।',
      },
      levels: ['N5', 'N4', 'N3'],
      href: '#kanji',
    },
  ];

  const JLPT = [
    {
      level: 'N5',
      label: { en: 'Beginner · 105 kanji', bn: 'বিগিনার · ১০৫ কাঞ্জি' },
      href: '#jlpt-n5',
      status: 'available',
    },
    {
      level: 'N4',
      label: { en: 'Elementary · 300 kanji', bn: 'এলিমেন্টারি · ৩০০ কাঞ্জি' },
      href: '#jlpt-n4',
      status: 'available',
    },
    {
      level: 'N3',
      label: { en: 'Intermediate · 650 kanji', bn: 'ইন্টারমিডিয়েট · ৬৫০ কাঞ্জি' },
      href: '#jlpt-n3',
      status: 'available',
    },
    {
      level: 'N2',
      label: { en: 'Upper-int. · 1000+ kanji', bn: 'আপার-ইন্টারমিডিয়েট · ১০০০+ কাঞ্জি' },
      href: null,
      status: 'soon',
    },
    {
      level: 'N1',
      label: { en: 'Advanced · 2000+ kanji', bn: 'অ্যাডভান্সড · ২০০০+ কাঞ্জি' },
      href: null,
      status: 'soon',
    },
  ];

  const PATHS = [
    {
      id: 'beginner',
      tone: 'primary',
      icon: 'あ',
      level: { en: 'N5 → N4', bn: 'N5 → N4' },
      title: { en: 'Start from zero', bn: 'শূন্য থেকে শুরু' },
      desc: {
        en: 'Learn hiragana and katakana, then your first 500 words with Minna Beginner and Kanji Look and Learn.',
        bn: 'হিরাগানা ও কাতাকানা শিখুন, তারপর Minna Beginner ও Kanji Look and Learn দিয়ে প্রথম ৫০০ শব্দ।',
      },
      cta: { en: 'Begin path', bn: 'পথ শুরু করুন' },
      href: '#lessons-n5',
    },
    {
      id: 'intermediate',
      tone: 'accent',
      icon: '中',
      level: { en: 'N4 → N3', bn: 'N4 → N3' },
      title: { en: 'Bridge to N3', bn: 'N3-এর সেতু' },
      desc: {
        en: 'Move past N5 with Minna Intermediate, thematic reading, and structured grammar from Shin Kanzen Master.',
        bn: 'Minna Intermediate, থিমেটিক রিডিং এবং Shin Kanzen Master-এর গঠনমূলক গ্রামার দিয়ে N5 পেরিয়ে এগিয়ে যান।',
      },
      cta: { en: 'Take the bridge', bn: 'সেতু পার হোন' },
      href: '#lessons-n4',
    },
    {
      id: 'jlpt',
      tone: 'success',
      icon: '受',
      level: { en: 'N5 → N3', bn: 'N5 → N3' },
      title: { en: 'JLPT-focused', bn: 'JLPT-কেন্দ্রিক' },
      desc: {
        en: 'Aim at a specific JLPT level. Vocabulary from Mimikara Oboeru, exam format from Shin Kanzen Master, mock tests weekly.',
        bn: 'নির্দিষ্ট JLPT লেভেলকে লক্ষ্য করুন। Mimikara Oboeru থেকে শব্দভান্ডার, Shin Kanzen Master থেকে পরীক্ষার ফরম্যাট, সাপ্তাহিক মক টেস্ট।',
      },
      cta: { en: 'Plan for JLPT', bn: 'JLPT-এর পরিকল্পনা' },
      href: '#jlpt',
    },
  ];

  /* ------------------------------------------------------------- Utils -- */
  const pick = (obj, lang) => (obj && (obj[lang] ?? obj.en)) || '';
  const getLang = () =>
    document.documentElement.lang === 'en' ? 'en' : 'bn';

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function txt(en, bn, lang) {
    // Renders a leaf span carrying data-en/data-bn so the shell's language
    // toggle updates it live without a re-render.
    return `<span data-en="${esc(en)}" data-bn="${esc(bn)}">${esc(pick({ en, bn }, lang))}</span>`;
  }

  /* ------------------------------------------------------ Progress read -- */
  function readProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return null;
      if (typeof p.courseId !== 'string') return null;
      if (typeof p.totalLessons !== 'number' || p.totalLessons <= 0) return null;
      if (typeof p.completedLessons !== 'number') return null;
      if (typeof p.currentLesson !== 'number') return null;
      return p;
    } catch (_) {
      return null;
    }
  }

  /* -------------------------------------------------- Continue-learning -- */
  function renderContinue() {
    const slot = document.querySelector('[data-continue-body]');
    if (!slot) return;

    const lang = getLang();
    const p = readProgress();
    slot.innerHTML = p ? withProgressHTML(p, lang) : emptyProgressHTML(lang);
  }

  function emptyProgressHTML(lang) {
    return `
      <div class="continue__body">
        <h2 class="continue__title">
          ${txt('You haven’t started yet', 'আপনি এখনো শুরু করেননি', lang)}
        </h2>
        <p class="continue__meta">
          ${txt(
            'Begin with N5 — Minna no Nihongo Lesson 1.',
            'N5 দিয়ে শুরু করুন — Minna no Nihongo লেসন ১।',
            lang
          )}
        </p>
        <a class="btn btn--primary continue__cta" href="#textbooks">
          ${txt('Start Lesson 1', 'লেসন ১ শুরু করুন', lang)}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    `;
  }

  function withProgressHTML(p, lang) {
    const totalLessons = Math.max(1, p.totalLessons);
    const completed = Math.max(0, Math.min(totalLessons, p.completedLessons));
    const currentP = Math.max(0, Math.min(1, p.currentLessonProgress ?? 0));
    const overallPct = Math.round(((completed + currentP) / totalLessons) * 100);
    const lessonPct = Math.round(currentP * 100);

    const book = BOOKS.find((b) => b.id === p.courseId);
    const courseLabel = book
      ? pick(book.title, lang)
      : (p.courseLabel ? pick(p.courseLabel, lang) : p.courseId);

    const lessonTitleEn = (p.currentLessonTitle && p.currentLessonTitle.en) || `Lesson ${p.currentLesson}`;
    const lessonTitleBn = (p.currentLessonTitle && p.currentLessonTitle.bn) || `লেসন ${p.currentLesson}`;
    const lessonTitle = lang === 'en' ? lessonTitleEn : lessonTitleBn;

    const lessonOfEn = `Lesson ${p.currentLesson} of ${totalLessons}`;
    const lessonOfBn = `লেসন ${p.currentLesson} / ${totalLessons}`;

    const overallEn = `${overallPct}% complete`;
    const overallBn = `${overallPct}% সম্পন্ন`;

    const lessonPctEn = `This lesson ${lessonPct}%`;
    const lessonPctBn = `এই লেসন ${lessonPct}%`;

    const progressAria = lang === 'en' ? 'Course progress' : 'কোর্সের অগ্রগতি';
    const resumeEn = 'Resume lesson';
    const resumeBn = 'লেসন চালিয়ে যান';

    return `
      <div class="continue__body">
        <div class="continue__head">
          <span class="badge badge--primary">${esc(courseLabel)}</span>
          <span class="continue__meta">${txt(lessonOfEn, lessonOfBn, lang)}</span>
        </div>

        <h2 class="continue__title">
          <span data-en="${esc(lessonTitleEn)}" data-bn="${esc(lessonTitleBn)}">${esc(lessonTitle)}</span>
        </h2>

        <div class="continue__progress">
          <div
            class="progress"
            role="progressbar"
            aria-valuenow="${overallPct}"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="${esc(progressAria)}"
          >
            <div class="progress__bar" style="width:${overallPct}%"></div>
          </div>
          <div class="continue__progress-row">
            <span>${txt(overallEn, overallBn, lang)}</span>
            <span>${txt(lessonPctEn, lessonPctBn, lang)}</span>
          </div>
        </div>

        <a class="btn btn--primary continue__cta" href="#">
          ${txt(resumeEn, resumeBn, lang)}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    `;
  }

  /* --------------------------------------------------- Textbook cards -- */
  function renderBooks() {
    const host = document.querySelector('[data-books]');
    if (!host) return;

    const lang = getLang();
    host.innerHTML = BOOKS.map((b) => {
      const title = pick(b.title, lang);
      const subtitle = pick(b.subtitle, lang);
      const desc = pick(b.desc, lang);
      const levels = b.levels
        .map((l) => `<span class="badge badge--neutral">${esc(l)}</span>`)
        .join('');

      return `
        <a class="book-card" href="${esc(b.href)}" aria-label="${esc(title)}">
          <span class="book-card__icon book-card__icon--${esc(b.tone)}" aria-hidden="true">${esc(b.icon)}</span>
          <h3 class="book-card__title">${txt(b.title.en, b.title.bn, lang)}</h3>
          <p class="book-card__sub">${txt(b.subtitle.en, b.subtitle.bn, lang)}</p>
          <p class="book-card__desc">${txt(b.desc.en, b.desc.bn, lang)}</p>
          <div class="book-card__foot">
            ${levels}
            <span class="book-card__arrow" aria-hidden="true">→</span>
          </div>
        </a>
      `;
    }).join('');
  }

  /* ------------------------------------------------------- JLPT strip -- */
  function renderJlpt() {
    const host = document.querySelector('[data-jlpt]');
    if (!host) return;

    const lang = getLang();
    host.innerHTML = JLPT.map((j) => {
      const soon = j.status === 'soon';
      const metaLabel = pick(j.label, lang);
      const soonEn = 'Coming soon';
      const soonBn = 'শীঘ্রই আসছে';
      const startEn = 'Start';
      const startBn = 'শুরু';

      const inner = `
        <span class="jlpt-chip__level" aria-hidden="true">${esc(j.level)}</span>
        <p class="jlpt-chip__meta">${txt(j.label.en, j.label.bn, lang)}</p>
        <div class="jlpt-chip__foot">
          <span class="badge ${soon ? 'badge--outline' : 'badge--primary'}">
            ${soon ? txt(soonEn, soonBn, lang) : txt(startEn, startBn, lang)}
          </span>
        </div>
      `;

      if (soon) {
        return `<div class="jlpt-chip jlpt-chip--soon" aria-disabled="true">${inner}</div>`;
      }
      const ariaLabel = `${j.level} — ${metaLabel}`;
      return `<a class="jlpt-chip" href="${esc(j.href)}" aria-label="${esc(ariaLabel)}">${inner}</a>`;
    }).join('');
  }

  /* ------------------------------------------------------ Path cards -- */
  function renderPaths() {
    const host = document.querySelector('[data-paths]');
    if (!host) return;

    const lang = getLang();
    host.innerHTML = PATHS.map((p) => {
      const title = pick(p.title, lang);
      const level = pick(p.level, lang);
      return `
        <a class="path-card path-card--${esc(p.tone)}" href="${esc(p.href)}" aria-label="${esc(title)}">
          <div class="path-card__head">
            <span class="path-card__icon" aria-hidden="true">${esc(p.icon)}</span>
            <span class="badge badge--neutral">${esc(level)}</span>
          </div>
          <h3 class="path-card__title">${txt(p.title.en, p.title.bn, lang)}</h3>
          <p class="path-card__desc">${txt(p.desc.en, p.desc.bn, lang)}</p>
          <span class="path-card__cta">
            ${txt(p.cta.en, p.cta.bn, lang)}
            <span aria-hidden="true">→</span>
          </span>
        </a>
      `;
    }).join('');
  }

  /* -------------------------------------------------------------- Boot -- */
  function renderAll() {
    renderContinue();
    renderBooks();
    renderJlpt();
    renderPaths();
  }

  function init() {
    renderAll();

    // Re-render the continue card if progress changes in another tab.
    window.addEventListener('storage', (e) => {
      if (e.key === PROGRESS_KEY || e.key === null) renderContinue();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ------------------------------------------------------ Dev helpers -- */
  window.Home = {
    readProgress,
    seedDemoProgress() {
      const now = Date.now();
      const payload = {
        courseId: 'minna-beginner',
        totalLessons: 50,
        completedLessons: 11,
        currentLesson: 12,
        currentLessonTitle: {
          en: 'Lesson 12 — 〜てください (Please do 〜)',
          bn: 'লেসন ১২ — 〜てください (অনুগ্রহ করে করুন)',
        },
        currentLessonProgress: 0.34,
        updatedAt: now,
      };
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload)); } catch (_) {}
      renderContinue();
      console.info('[Home] demo progress seeded:', payload);
      return payload;
    },
    clearProgress() {
      try { localStorage.removeItem(PROGRESS_KEY); } catch (_) {}
      renderContinue();
      console.info('[Home] progress cleared');
    },
  };
})();
