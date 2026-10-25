/* Phase 10 — progress dashboard. Reads from localStorage + DataLoader.
 * No writes. Never modifies Phase 0–9 keys.
 */
(function () {
  'use strict';

  // ---------- helpers ----------
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
  function readJSON(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function fmtDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function lessonSlugFromNumber(n) {
    return 'minna-' + String(n).padStart(3, '0');
  }
  function emptyState(en, bn, href, ctEn, ctBn) {
    return '<div class="empty"><p class="empty__msg">' + txt(en, bn) + '</p>' +
      (href ? '<a class="btn btn--secondary btn--sm" href="' + href + '">' + txt(ctEn, ctBn) + '</a>' : '') +
      '</div>';
  }

  // ---------- render: hero ----------
  function renderHero() {
    var el = document.getElementById('progress-hero');
    var p = readJSON('nihongo_progress', null);

    if (!p || !p.currentLesson) {
      el.innerHTML =
        '<div class="hero-card hero-card--empty">' +
          '<h2>' + txt('Ready when you are', 'যখন প্রস্তুত হবেন') + '</h2>' +
          '<p>' + txt(
            'Take the placement quiz to find your starting point, or jump straight into Lesson 1.',
            'শুরুর পয়েন্ট খুঁজতে প্লেসমেন্ট কুইজ দিন, অথবা সরাসরি পাঠ ১-এ ঝাঁপ দিন।'
          ) + '</p>' +
          '<div class="hero-card__actions">' +
            '<a class="btn btn--primary" href="placement.html">' + txt('Take placement quiz', 'প্লেসমেন্ট কুইজ দিন') + '</a>' +
            '<a class="btn btn--secondary" href="lesson.html?lesson=minna-001">' + txt('Start Lesson 1', 'পাঠ ১ শুরু করুন') + '</a>' +
          '</div>' +
        '</div>';
      return;
    }

    // Load course to resolve the current lesson's slug reliably.
    var slug = lessonSlugFromNumber(p.currentLesson);
    var finish = function () {
      var lang = document.documentElement.getAttribute('lang') || 'en';
      var title = p.currentLessonTitle
        ? (p.currentLessonTitle[lang] || p.currentLessonTitle.en || '')
        : '';
      var pct = Math.round((p.currentLessonProgress || 0) * 100);

      el.innerHTML =
        '<div class="hero-card">' +
          '<span class="badge badge--outline" style="background:rgba(255,255,255,0.15);color:#fff;border-color:rgba(255,255,255,0.4)">' +
            txt('Continue learning', 'শেখা চালিয়ে যান') +
          '</span>' +
          '<h2 class="hero-card__title">' +
            txt('Lesson ' + p.currentLesson, 'পাঠ ' + p.currentLesson) +
            (title ? ' · ' + esc(title) : '') +
          '</h2>' +
          '<div class="hero-card__progress">' +
            '<div class="progress"><div class="progress__bar" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div class="hero-card__foot">' +
            '<span>' + pct + '% ' + txt('complete', 'সম্পন্ন') + '</span>' +
            '<a class="btn btn--primary btn--sm" href="lesson.html?lesson=' + encodeURIComponent(slug) + '">' +
              txt('Resume →', 'চালিয়ে যান →') +
            '</a>' +
          '</div>' +
        '</div>';
    };

    if (!window.DataLoader) { finish(); return; }
    DataLoader.loadCourse().then(function (course) {
      var found = (course.lessons || []).find(function (m) {
        return m.lessonNumber === p.currentLesson;
      });
      if (found) slug = found.slug;
      finish();
    }).catch(finish);
  }

  // ---------- render: stat cards ----------
  function renderStats() {
    var el = document.getElementById('progress-stats');
    var p = readJSON('nihongo_progress', null);
    var meta = readJSON('nihongo_srs_meta', null);
    var log = readJSON('nihongo_srs_log', {});

    var done = p ? (p.completedLessons || 0) : 0;
    var total = p ? (p.totalLessons || 50) : 50;
    var streak = meta ? (meta.streakCurrent || 0) : 0;
    var longest = meta ? (meta.streakLongest || 0) : 0;

    var reviews = 0, correct = 0;
    Object.keys(log).forEach(function (k) {
      var d = log[k] || {};
      reviews += d.total || 0;
      correct += (d.hard || 0) + (d.good || 0) + (d.easy || 0);
    });
    var accuracy = reviews ? Math.round((correct / reviews) * 100) : 0;

    var pctDone = total ? Math.round((done / total) * 100) : 0;

    el.innerHTML =
      statCard('📚', done + ' / ' + total, 'Lessons completed', 'সম্পন্ন পাঠ', pctDone + '% of course') +
      statCard('🔥', String(streak), 'Day streak', 'দিনের স্ট্রিক', 'Longest: ' + longest) +
      statCard('🎯', accuracy + '%', 'Review accuracy', 'পুনরালোচনার নির্ভুলতা', reviews + ' reviews') +
      statCard('⏱️', String(meta ? (meta.totalReviews || 0) : 0), 'Total reviews', 'মোট পুনরালোচনা', 'All time');
  }

  function statCard(icon, value, labelEn, labelBn, sub) {
    return '<div class="stat-card">' +
      '<div class="stat-card__icon" aria-hidden="true">' + icon + '</div>' +
      '<div class="stat-card__value">' + esc(value) + '</div>' +
      '<div class="stat-card__label">' + txt(labelEn, labelBn) + '</div>' +
      '<div class="stat-card__sub">' + esc(sub) + '</div>' +
      '</div>';
  }

  // ---------- render: heatmap ----------
  function renderHeatmap() {
    var el = document.getElementById('progress-heatmap');
    var log = readJSON('nihongo_srs_log', {});
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // 12 weeks × 7 days, starting from the most recent Sunday minus 11 weeks.
    var start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    start.setDate(start.getDate() - 11 * 7);

    var html = '<div class="heatmap">';
    for (var w = 0; w < 12; w++) {
      html += '<div class="heatmap__week">';
      for (var d = 0; d < 7; d++) {
        var day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        if (day > today) {
          html += '<span class="heatmap__cell heatmap__cell--empty"></span>';
        } else {
          var key = fmtDate(day);
          var entry = log[key] || null;
          var total = entry ? (entry.total || 0) : 0;
          var level = total === 0 ? 0 : total < 5 ? 1 : total < 10 ? 2 : total < 20 ? 3 : 4;
          var title = key + ' · ' + total + ' ' + (total === 1 ? 'review' : 'reviews');
          html += '<span class="heatmap__cell heatmap__cell--l' + level + '" title="' + esc(title) + '"></span>';
        }
      }
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="heatmap__legend">';
    html += '<span class="heatmap__label">' + txt('Less', 'কম') + '</span>';
    [0, 1, 2, 3, 4].forEach(function (l) {
      html += '<span class="heatmap__cell heatmap__cell--l' + l + '"></span>';
    });
    html += '<span class="heatmap__label">' + txt('More', 'বেশি') + '</span>';
    html += '</div>';

    el.innerHTML = html;
  }

  // ---------- render: quizzes ----------
  function renderQuizzes() {
    var el = document.getElementById('progress-quizzes');
    var quiz = readJSON('nihongo_quiz_history', {});
    var keys = Object.keys(quiz);

    if (!keys.length) {
      el.innerHTML = emptyState(
        'No quizzes taken yet.', 'এখনও কোনও কুইজ নেওয়া হয়নি।',
        'quiz.html', 'Take a quiz', 'কুইজ নিন'
      );
      return;
    }

    keys.sort(function (a, b) {
      return ((quiz[b] || {}).lastAt || 0) - ((quiz[a] || {}).lastAt || 0);
    });

    var html = '<div class="quiz-table">';
    html += '<div class="quiz-table__head">' +
      '<span>' + txt('Lesson', 'পাঠ') + '</span>' +
      '<span>' + txt('Best', 'সেরা') + '</span>' +
      '<span>' + txt('Last', 'শেষ') + '</span>' +
      '<span>' + txt('Tries', 'প্রচেষ্টা') + '</span>' +
      '</div>';
    keys.forEach(function (slug) {
      var h = quiz[slug] || {};
      var n = parseInt(slug.split('-').pop(), 10) || '';
      html += '<a class="quiz-table__row" href="quiz.html">' +
        '<span class="quiz-table__slug">' + txt('Lesson ' + n, 'পাঠ ' + n) + '</span>' +
        '<span class="quiz-table__pct">' + (h.best || 0) + '%</span>' +
        '<span class="quiz-table__pct">' + (h.last || 0) + '%</span>' +
        '<span class="quiz-table__num">' + (h.attempts || 0) + '</span>' +
        '</a>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  // ---------- render: weak items ----------
  function renderWeak() {
    var el = document.getElementById('progress-weak');
    var cards = readJSON('nihongo_srs_cards', {});
    var entries = Object.keys(cards).map(function (k) {
      var parts = k.split(':');
      return { key: k, slug: parts[0], vocabId: parts.slice(1).join(':'), card: cards[k] || {} };
    }).filter(function (x) {
      var c = x.card;
      return (c.lapses && c.lapses >= 2) || (typeof c.ease === 'number' && c.ease < 2.0);
    });

    if (!entries.length) {
      el.innerHTML = '<div class="empty"><p class="empty__msg">' +
        txt('No weak items yet — keep reviewing!', 'এখনও দুর্বল আইটেম নেই — পুনরালোচনা চালিয়ে যান!') +
        '</p></div>';
      return;
    }

    entries.sort(function (a, b) {
      var la = a.card.lapses || 0, lb = b.card.lapses || 0;
      if (lb !== la) return lb - la;
      return (a.card.ease || 2.5) - (b.card.ease || 2.5);
    });
    entries = entries.slice(0, 10);

    // Load the lessons those cards belong to so we can display the vocab text.
    var slugs = {};
    entries.forEach(function (e) { slugs[e.slug] = 1; });
    var slugList = Object.keys(slugs);
    var lessonMap = {};

    var done = function () {
      var html = '<ul class="weak-list">';
      entries.forEach(function (e) {
        var lesson = lessonMap[e.slug];
        var vocab = lesson && (lesson.vocabulary || []).find(function (v) {
          return v.id === e.vocabId;
        });
        var jp = vocab ? (vocab.kanji || vocab.furigana || e.vocabId) : e.vocabId;
        var furi = vocab ? (vocab.furigana || '') : '';
        var en = vocab ? (vocab.english_meaning || '') : '';
        var bn = vocab ? (vocab.bengali_meaning || '') : '';
        var href = 'lesson.html?lesson=' + encodeURIComponent(e.slug) + '#vocabulary';
        html += '<li class="weak-item">' +
          '<a class="weak-item__main" href="' + href + '">' +
            '<span class="weak-item__jp">' + ruby(jp, furi) + '</span>' +
            '<span class="weak-item__meaning">' + txt(en, bn) + '</span>' +
          '</a>' +
          '<div class="weak-item__meta">' +
            '<span class="badge badge--warn">' + (e.card.lapses || 0) + ' ' + txt('lapses', 'ল্যাপ্স') + '</span>' +
            '<span class="weak-item__ease">ease ' + (e.card.ease || 2.5).toFixed(2) + '</span>' +
          '</div>' +
        '</li>';
      });
      html += '</ul>';
      el.innerHTML = html;
    };

    if (!window.DataLoader || !slugList.length) { done(); return; }
    Promise.all(slugList.map(function (slug) {
      return DataLoader.loadLesson(slug).then(function (lesson) {
        lessonMap[slug] = lesson;
      }).catch(function () {
        lessonMap[slug] = null;
      });
    })).then(done).catch(done);
  }

  // ---------- render: bookmarks ----------
  function renderBookmarks() {
    var el = document.getElementById('progress-bookmarks');
    var bm = readJSON('nihongo_bookmarks', {});
    var slugs = Object.keys(bm);

    if (!slugs.length) {
      el.innerHTML = emptyState(
        'No bookmarked lessons yet.', 'এখনও কোনও বুকমার্ক করা পাঠ নেই।',
        'lesson.html?lesson=minna-001', 'Browse lessons', 'পাঠ দেখুন'
      );
      return;
    }

    slugs.sort(function (a, b) { return bm[b] - bm[a]; });

    var finish = function (map) {
      var html = '<ul class="bookmark-list">';
      slugs.forEach(function (slug) {
        var m = map[slug];
        var title = m ? (m.title || {}) : { en: slug, bn: slug };
        var num = m ? m.lessonNumber : '';
        html += '<li class="bookmark-item">' +
          '<a class="bookmark-item__link" href="lesson.html?lesson=' + encodeURIComponent(slug) + '">' +
            '<span class="bookmark-item__badge">' + (num ? 'L' + num : '•') + '</span>' +
            '<span class="bookmark-item__title">' + txt(title.en || '', title.bn || '') + '</span>' +
            '<span class="bookmark-item__arrow" aria-hidden="true">→</span>' +
          '</a></li>';
      });
      html += '</ul>';
      el.innerHTML = html;
    };

    if (!window.DataLoader) { finish({}); return; }
    DataLoader.loadCourse().then(function (course) {
      var map = {};
      (course.lessons || []).forEach(function (m) { map[m.slug] = m; });
      finish(map);
    }).catch(function () { finish({}); });
  }

  // ---------- render: kanji quiz ----------
  function renderKanji() {
    var el = document.getElementById('progress-kanji');
    var h = readJSON('nihongo_kanji_quiz_history', null);
    if (!h) {
      el.innerHTML = emptyState(
        'No kanji quiz yet.', 'এখনও কোনও কাঞ্জি কুইজ নেই।',
        'kanji.html?quiz=1', 'Take kanji quiz', 'কাঞ্জি কুইজ নিন'
      );
      return;
    }
    el.innerHTML =
      '<div class="kanji-stats">' +
        '<div class="kanji-stats__item"><span class="kanji-stats__value">' + (h.best || 0) + '%</span><span class="kanji-stats__label">' + txt('Best', 'সেরা') + '</span></div>' +
        '<div class="kanji-stats__item"><span class="kanji-stats__value">' + (h.last || 0) + '%</span><span class="kanji-stats__label">' + txt('Last', 'শেষ') + '</span></div>' +
        '<div class="kanji-stats__item"><span class="kanji-stats__value">' + (h.attempts || 0) + '</span><span class="kanji-stats__label">' + txt('Attempts', 'প্রচেষ্টা') + '</span></div>' +
      '</div>' +
      '<a class="btn btn--secondary btn--sm" href="kanji.html?quiz=1">' + txt('Retake kanji quiz', 'আবার কাঞ্জি কুইজ নিন') + '</a>';
  }

  // ---------- init ----------
  function init() {
    renderHero();
    renderStats();
    renderHeatmap();
    renderQuizzes();
    renderWeak();
    renderBookmarks();
    renderKanji();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
