/* Phase 3 — home page.
 * Renders: continue card · six textbook cards · JLPT strip · three paths.
 * Reads nihongo_progress; reacts to storage events.
 * Dev helpers: Home.seedDemoProgress() · Home.clearProgress() · Home.readProgress()
 */
(function () {
  'use strict';

  var COURSE_ID = 'minna-beginner';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function txt(en, bn) {
    return '<span data-en="' + esc(en) + '" data-bn="' + esc(bn) + '">' + esc(en) + '</span>';
  }
  function ruby(base, furi) {
    if (!base) return esc(furi || '');
    if (!furi) return esc(base);
    return '<ruby>' + esc(base) + '<rt>' + esc(furi) + '</rt></ruby>';
  }
  function readProgress() {
    try {
      var raw = localStorage.getItem('nihongo_progress');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function slugForLesson(n) {
    return 'minna-' + String(n).padStart(3, '0');
  }

  /* ---------- continue card ---------- */
  function renderContinue(host) {
    var p = readProgress();

    if (!p || !p.currentLesson) {
      host.innerHTML =
        '<div class="continue continue--empty">' +
          '<div class="continue__body">' +
            '<p class="continue__kicker">' + txt('Start here', 'এখান থেকে শুরু করুন') + '</p>' +
            '<h2 class="continue__title">' + txt('Lesson 1 — Introduction', 'পাঠ ১ — ভূমিকা') + '</h2>' +
            '<p class="continue__lead">' +
              txt(
                'Begin with greetings, basic particles, and your first 15 words.',
                'সম্বোধন, মৌলিক পার্টিকেল এবং প্রথম ১৫টি শব্দ দিয়ে শুরু করুন।'
              ) +
            '</p>' +
          '</div>' +
          '<div class="continue__actions">' +
            '<a class="btn btn--primary" href="lesson.html?lesson=minna-001">' +
              txt('Start Lesson 1 →', 'পাঠ ১ শুরু করুন →') +
            '</a>' +
          '</div>' +
        '</div>';
      return;
    }

    var lang = document.documentElement.getAttribute('lang') || 'en';
    var title = p.currentLessonTitle
      ? (p.currentLessonTitle[lang] || p.currentLessonTitle.en || '')
      : '';
    var pct = Math.round((p.currentLessonProgress || 0) * 100);
    var totalPct = p.totalLessons
      ? Math.round(((p.completedLessons || 0) / p.totalLessons) * 100)
      : 0;

    host.innerHTML =
      '<div class="continue">' +
        '<div class="continue__body">' +
          '<p class="continue__kicker">' + txt('Continue learning', 'শেখা চালিয়ে যান') + '</p>' +
          '<h2 class="continue__title">' +
            txt('Lesson ' + p.currentLesson, 'পাঠ ' + p.currentLesson) +
            (title ? ' · ' + esc(title) : '') +
          '</h2>' +
          '<div class="continue__bars">' +
            '<div class="continue__bar">' +
              '<div class="continue__bar-label">' +
                txt('This lesson', 'এই পাঠ') + ' · ' + pct + '%' +
              '</div>' +
              '<div class="progress"><div class="progress__bar" style="width:' + pct + '%"></div></div>' +
            '</div>' +
            '<div class="continue__bar">' +
              '<div class="continue__bar-label">' +
                txt('Course', 'কোর্স') + ' · ' + (p.completedLessons || 0) + ' / ' + (p.totalLessons || 50) +
              '</div>' +
              '<div class="progress"><div class="progress__bar" style="width:' + totalPct + '%"></div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="continue__actions">' +
          '<span class="badge badge--outline">' + txt('Course', 'কোর্স') + ' · ' + esc(p.courseId || COURSE_ID) + '</span>' +
          '<a class="btn btn--primary" href="lesson.html?lesson=' +
            encodeURIComponent(slugForLesson(p.currentLesson)) + '">' +
            txt('Resume lesson →', 'পাঠ চালিয়ে যান →') +
          '</a>' +
        '</div>' +
      '</div>';
  }

  /* ---------- textbook cards ---------- */
  var BOOKS = [
    {
      key: 'minna-beginner', icon: 'book',
      title: { en: 'Minna Beginner', bn: 'মিন্না বিগিনার' },
      subtitle: { en: 'Lessons 1–25', bn: 'পাঠ ১–২৫' },
      desc: { en: 'The core N5 → N4 course. Vocabulary, grammar, reading, listening.',
              bn: 'মূল N5 → N4 কোর্স। শব্দভাণ্ডার, ব্যাকরণ, পড়া, শোনা।' },
      levels: ['N5', 'N4'], href: 'lesson.html?lesson=minna-001'
    },
    {
      key: 'minna-intermediate', icon: 'book',
      title: { en: 'Minna Intermediate', bn: 'মিন্না ইন্টারমিডিয়েট' },
      subtitle: { en: 'Lessons 26–50', bn: 'পাঠ ২৬–৫০' },
      desc: { en: 'Continuing N4 → N3. Keigo, conditionals, longer passages.',
              bn: 'N4 → N3 চলমান। কেইগো, শর্তসাপেক্ষ, দীর্ঘ অনুচ্ছেদ।' },
      levels: ['N4', 'N3'], href: 'lesson.html?lesson=minna-026', soon: true
    },
    {
      key: 'temabetsu', icon: 'book',
      title: { en: 'Temabetsu', bn: 'তেমাবেতসু' },
      subtitle: { en: 'Themed readings', bn: 'বিষয়ভিত্তিক পড়া' },
      desc: { en: 'Short bilingual essays with grammar notes.',
              bn: 'ব্যাকরণ নোটসহ সংক্ষিপ্ত দ্বিভাষিক রচনা।' },
      levels: ['N4', 'N3'], soon: true
    },
    {
      key: 'mimikara', icon: 'practice',
      title: { en: 'Mimikara Oboeru', bn: 'মিমিকারা ওবোয়ারু' },
      subtitle: { en: 'Vocabulary by theme', bn: 'বিষয়ভিত্তিক শব্দভাণ্ডার' },
      desc: { en: 'Grouped vocabulary for memory efficiency.',
              bn: 'স্মৃতি-দক্ষতার জন্য দলবদ্ধ শব্দভাণ্ডার।' },
      levels: ['N3'], soon: true
    },
    {
      key: 'shinkanzen', icon: 'practice',
      title: { en: 'Shin Kanzen Master', bn: 'শিন কানজেন মাস্টার' },
      subtitle: { en: 'Grammar · Reading · Listening', bn: 'ব্যাকরণ · পড়া · শোনা' },
      desc: { en: 'JLPT-focused skill drills for N3 and beyond.',
              bn: 'N3 এবং তার উপরে JLPT-কেন্দ্রিক দক্ষতা অনুশীলন।' },
      levels: ['N3'], soon: true
    },
    {
      key: 'kanji', icon: 'kanji',
      title: { en: 'Kanji Look and Learn', bn: 'কাঞ্জি লুক অ্যান্ড লার্ন' },
      subtitle: { en: 'Stroke order & examples', bn: 'স্ট্রোক অর্ডার ও উদাহরণ' },
      desc: { en: 'Every kanji with stroke animation, readings, and example words.',
              bn: 'স্ট্রোক অ্যানিমেশন, পাঠ এবং উদাহরণ শব্দসহ প্রতিটি কাঞ্জি।' },
      levels: ['N5', 'N4', 'N3'], href: 'kanji.html'
    }
  ];

  function renderBooks(host) {
    var html = '';
    BOOKS.forEach(function (b) {
      var levels = b.levels.map(function (l) {
        return '<span class="badge badge--primary">' + esc(l) + '</span>';
      }).join(' ');
      var wrap = b.soon ? 'div' : 'a';
      var attrs = b.soon
        ? ' class="book book--soon" aria-disabled="true"'
        : ' class="book book--link" href="' + esc(b.href) + '"';
      html += '<' + wrap + attrs + '>';
      html += '<div class="book__icon" aria-hidden="true">' + esc(b.icon === 'kanji' ? '字' : '本') + '</div>';
      html += '<div class="book__body">';
      html += '<h3 class="book__title">' + txt(b.title.en, b.title.bn) + '</h3>';
      html += '<p class="book__subtitle">' + txt(b.subtitle.en, b.subtitle.bn) + '</p>';
      html += '<p class="book__desc">' + txt(b.desc.en, b.desc.bn) + '</p>';
      html += '<div class="book__levels">' + levels + '</div>';
      html += '</div>';
      html += b.soon
        ? '<span class="book__soon">' + txt('Coming soon', 'শীঘ্রই আসছে') + '</span>'
        : '<span class="book__arrow" aria-hidden="true">→</span>';
      html += '</' + wrap + '>';
    });
    host.innerHTML = html;
  }

  /* ---------- JLPT strip ---------- */
  var JLPT = [
    { level: 'N5', state: 'ready', href: 'lesson.html?lesson=minna-001' },
    { level: 'N4', state: 'ready', href: 'lesson.html?lesson=minna-026' },
    { level: 'N3', state: 'ready', href: 'lesson.html?lesson=minna-050' },
    { level: 'N2', state: 'soon', href: null },
    { level: 'N1', state: 'soon', href: null }
  ];

  function renderJLPT(host) {
    var html = '<div class="jlpt-strip">';
    JLPT.forEach(function (l) {
      if (l.state === 'ready') {
        html += '<a class="jlpt-card jlpt-card--ready" href="' + esc(l.href) + '">' +
          '<span class="jlpt-card__level">' + esc(l.level) + '</span>' +
          '<span class="jlpt-card__tag badge badge--primary">' + txt('Start', 'শুরু') + '</span>' +
        '</a>';
      } else {
        html += '<div class="jlpt-card jlpt-card--soon" aria-disabled="true">' +
          '<span class="jlpt-card__level">' + esc(l.level) + '</span>' +
          '<span class="jlpt-card__tag badge badge--outline">' + txt('Coming soon', 'শীঘ্রই') + '</span>' +
        '</div>';
      }
    });
    html += '</div>';
    host.innerHTML = html;
  }

  /* ---------- paths ---------- */
  var PATHS = [
    {
      color: 'primary',
      title: { en: 'Beginner', bn: 'বিগিনার' },
      range: { en: 'N5 → N4', bn: 'N5 → N4' },
      desc: { en: 'Start from zero. Hiragana, katakana, and the first 25 lessons.',
              bn: 'শূন্য থেকে শুরু। হিরাগানা, কাতাকানা, প্রথম ২৫ পাঠ।' },
      href: 'lesson.html?lesson=minna-001'
    },
    {
      color: 'accent',
      title: { en: 'Intermediate', bn: 'ইন্টারমিডিয়েট' },
      range: { en: 'N4 → N3', bn: 'N4 → N3' },
      desc: { en: 'Already know the basics. Continue into keigo and complexity.',
              bn: 'মৌলিক জানা আছে। কেইগো এবং জটিলতায় এগিয়ে যান।' },
      href: 'lesson.html?lesson=minna-026'
    },
    {
      color: 'warn',
      title: { en: 'JLPT-focused', bn: 'JLPT-কেন্দ্রিক' },
      range: { en: 'N5 → N3', bn: 'N5 → N3' },
      desc: { en: 'Target the exam. Practice-heavy, drill-oriented, timed.',
              bn: 'পরীক্ষার জন্য প্রস্তুতি। অনুশীলন-ভারী, ড্রিল-কেন্দ্রিক, সময়বদ্ধ।' },
      href: 'placement.html'
    }
  ];

  function renderPaths(host) {
    var html = '';
    PATHS.forEach(function (p) {
      html += '<a class="path path--' + p.color + '" href="' + esc(p.href) + '">';
      html += '<div class="path__head">';
      html += '<h3 class="path__title">' + txt(p.title.en, p.title.bn) + '</h3>';
      html += '<span class="path__range">' + txt(p.range.en, p.range.bn) + '</span>';
      html += '</div>';
      html += '<p class="path__desc">' + txt(p.desc.en, p.desc.bn) + '</p>';
      html += '<span class="path__cta">' + txt('Start this path →', 'এই পথ শুরু করুন →') + '</span>';
      html += '</a>';
    });
    host.innerHTML = html;
  }

  /* ---------- dev helpers ---------- */
  window.Home = {
    readProgress: readProgress,
    seedDemoProgress: function () {
      var data = {
        courseId: COURSE_ID,
        totalLessons: 50,
        completedLessons: 11,
        currentLesson: 12,
        currentLessonTitle: { en: 'Time and dates', bn: 'সময় ও তারিখ' },
        currentLessonProgress: 0.34,
        updatedAt: Date.now()
      };
      localStorage.setItem('nihongo_progress', JSON.stringify(data));
      renderContinue(document.querySelector('[data-slot="continue"]'));
      return data;
    },
    clearProgress: function () {
      localStorage.removeItem('nihongo_progress');
      renderContinue(document.querySelector('[data-slot="continue"]'));
    }
  };

  /* ---------- init ---------- */
  function init() {
    var slot;
    if ((slot = document.querySelector('[data-slot="continue"]'))) renderContinue(slot);
    if ((slot = document.querySelector('[data-slot="books"]')))    renderBooks(slot);
    if ((slot = document.querySelector('[data-slot="jlpt"]')))     renderJLPT(slot);
    if ((slot = document.querySelector('[data-slot="paths"]')))    renderPaths(slot);

    window.addEventListener('storage', function (e) {
      if (e.key === 'nihongo_progress') renderContinue(document.querySelector('[data-slot="continue"]'));
    });
    document.addEventListener('shell:langchange', function () {
      renderContinue(document.querySelector('[data-slot="continue"]'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();


// --- Phase 13: Continue Learning Card ---
function renderContinueCard() {
  const progress = JSON.parse(localStorage.getItem('nihongo_progress') || 'null');
  const card = document.getElementById('continue-card');
  if (!card) return;
  
  if (!progress || progress.completedLessons === 0) {
    card.hidden = true;
    return;
  }
  
  const percent = Math.round((progress.completedLessons / progress.totalLessons) * 100);
  const lessonNum = progress.currentLesson || 1;
  const lessonTitle = progress.currentLessonTitle?.en || `Lesson ${lessonNum}`;
  
  card.querySelector('[data-en="Continue learning"]').textContent = `Continue: ${lessonTitle}`;
  card.querySelector('[data-bn="শেখা চালিয়ে যান"]').textContent = `চালিয়ে যান: ${lessonTitle}`;
  card.querySelector('.continue-card__progress-fill').style.width = `${percent}%`;
  card.querySelector('.continue-card__percent').textContent = `${percent}%`;
  card.querySelector('.continue-card__cta').href = `lesson.html?lesson=minna-${String(lessonNum).padStart(3, '0')}`;
  card.hidden = false;
}

// Call after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderContinueCard);
} else {
  renderContinueCard();
}
