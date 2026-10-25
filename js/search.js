/* Phase 10 — global search.
 * Builds a flat index from every lesson (vocab, grammar, kanji) plus one
 * lesson-level row per lesson. Searches kana / romaji / English / Bengali
 * with field-weighted scoring. Pre-fills from ?q= and shell:search.
 */
(function () {
  'use strict';

  var state = {
    index: [],
    building: true,
    results: [],
    q: ''
  };

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
  function norm(s) { return String(s == null ? '' : s).toLowerCase().trim(); }
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  // ---------- index build ----------
  function buildIndex() {
    if (!window.DataLoader) return Promise.resolve();
    return DataLoader.loadCourse().then(function (course) {
      var manifests = (course.lessons || []).slice().sort(function (a, b) {
        return (a.lessonNumber || 0) - (b.lessonNumber || 0);
      });

      var entries = [];

      // lesson rows (immediate — no per-lesson fetch needed)
      manifests.forEach(function (m) {
        entries.push({
          type: 'lesson',
          slug: m.slug,
          number: m.lessonNumber,
          title: m.title || { en: m.slug, bn: m.slug },
          href: 'lesson.html?lesson=' + encodeURIComponent(m.slug),
          haystack: norm([
            m.title && m.title.en, m.title && m.title.bn,
            'lesson ' + m.lessonNumber, 'পাঠ ' + m.lessonNumber,
            m.slug, (m.tags || []).join(' ')
          ].join(' '))
        });
      });

      // per-lesson data, fetched in parallel
      return Promise.all(manifests.map(function (m) {
        return DataLoader.loadLesson(m.slug).then(function (lesson) {
          return { manifest: m, lesson: lesson };
        }).catch(function () {
          return { manifest: m, lesson: null };
        });
      })).then(function (loaded) {
        loaded.forEach(function (row) {
          var m = row.manifest, lesson = row.lesson;
          if (!lesson) return;

          (lesson.vocabulary || []).forEach(function (v) {
            var jp = v.kanji || v.furigana || '';
            var furi = v.furigana || '';
            entries.push({
              type: 'vocab',
              slug: m.slug,
              number: m.lessonNumber,
              id: v.id,
              jp: jp, furigana: furi,
              romaji: v.romaji || '',
              en: v.english_meaning || '',
              bn: v.bengali_meaning || '',
              href: 'lesson.html?lesson=' + encodeURIComponent(m.slug) + '#vocabulary',
              haystack: norm([
                v.kanji, furi, v.romaji, v.english_meaning, v.bengali_meaning,
                (v.tags || []).join(' ')
              ].join(' '))
            });
          });

          (lesson.grammar || []).forEach(function (g) {
            entries.push({
              type: 'grammar',
              slug: m.slug,
              number: m.lessonNumber,
              id: g.id,
              jp: g.pattern || '',
              furigana: '',
              romaji: '',
              en: g.meaning_en || '',
              bn: g.meaning_bn || '',
              href: 'lesson.html?lesson=' + encodeURIComponent(m.slug) + '#grammar',
              haystack: norm([
                g.pattern, g.meaning_en, g.meaning_bn, (g.tags || []).join(' ')
              ].join(' '))
            });
          });

          (lesson.kanji || []).forEach(function (k) {
            var on = (k.onyomi || []).join('・');
            var kun = (k.kunyomi || []).join('・');
            var en = (k.meanings && k.meanings.en || []).join(', ');
            var bn = (k.meanings && k.meanings.bn || []).join(', ');
            entries.push({
              type: 'kanji',
              slug: m.slug,
              number: m.lessonNumber,
              id: k.character,
              jp: k.character || '',
              furigana: [on, kun].filter(Boolean).join(' · '),
              romaji: '',
              en: en,
              bn: bn,
              href: 'kanji.html?char=' + encodeURIComponent(k.character || ''),
              haystack: norm([k.character, on, kun, en, bn].join(' '))
            });
          });
        });

        // dedupe kanji by character (keep first)
        var seenKanji = {};
        state.index = entries.filter(function (e) {
          if (e.type !== 'kanji') return true;
          if (seenKanji[e.jp]) return false;
          seenKanji[e.jp] = 1;
          return true;
        });
      });
    }).catch(function (err) {
      console.warn('[search] index build failed', err);
    }).then(function () {
      state.building = false;
    });
  }

  // ---------- scoring ----------
  function search(q) {
    var nq = norm(q);
    if (!nq) return [];
    var scored = [];
    for (var i = 0; i < state.index.length; i++) {
      var e = state.index[i];
      var score = 0;
      var fields = [e.jp, e.furigana, e.romaji, e.en, e.bn];
      for (var j = 0; j < fields.length; j++) {
        var f = norm(fields[j]);
        if (!f) continue;
        if (f === nq) score = Math.max(score, 100);
        else if (f.indexOf(nq) === 0) score = Math.max(score, 60);
        else if (f.indexOf(nq) !== -1) score = Math.max(score, 30);
      }
      if (score === 0 && e.haystack.indexOf(nq) !== -1) score = 10;
      if (score > 0) scored.push({ e: e, score: score });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return (a.e.number || 0) - (b.e.number || 0);
    });
    return scored.map(function (s) { return s.e; });
  }

  // ---------- render ----------
  function render(q) {
    var statusEl = document.getElementById('search-status');
    var resultsEl = document.getElementById('search-results');

    if (state.building) {
      statusEl.innerHTML = txt('Building search index…', 'অনুসন্ধান ইনডেক্স তৈরি হচ্ছে…');
      resultsEl.innerHTML = '';
      return;
    }
    if (!q) {
      statusEl.innerHTML = txt(
        'Type to search lessons, vocabulary, grammar, and kanji.',
        'পাঠ, শব্দভাণ্ডার, ব্যাকরণ এবং কাঞ্জি অনুসন্ধান করতে টাইপ করুন।'
      );
      resultsEl.innerHTML = '';
      return;
    }

    state.results = search(q);
    resultsEl.setAttribute('aria-busy', 'false');

    if (!state.results.length) {
      statusEl.innerHTML = txt('No matches for ', 'কোনও ফলাফল নেই: ') + '“<strong>' + esc(q) + '</strong>”';
      resultsEl.innerHTML = '';
      return;
    }

    statusEl.innerHTML = state.results.length + ' ' + txt(
      state.results.length === 1 ? 'result' : 'results',
      'ফলাফল'
    );

    // group
    var groups = { lesson: [], vocab: [], grammar: [], kanji: [] };
    state.results.forEach(function (r) { groups[r.type].push(r); });
    var labels = {
      lesson: { en: 'Lessons', bn: 'পাঠ' },
      vocab: { en: 'Vocabulary', bn: 'শব্দভাণ্ডার' },
      grammar: { en: 'Grammar', bn: 'ব্যাকরণ' },
      kanji: { en: 'Kanji', bn: 'কাঞ্জি' }
    };

    var html = '';
    ['lesson', 'vocab', 'grammar', 'kanji'].forEach(function (type) {
      var list = groups[type];
      if (!list.length) return;
      html += '<section class="search-group"><h2 class="search-group__title">';
      html += txt(labels[type].en, labels[type].bn);
      html += '<span class="search-group__count">' + list.length + '</span>';
      html += '</h2><ul class="search-group__list">';

      list.forEach(function (r) {
        html += '<li><a class="search-result" href="' + esc(r.href) + '">';
        html += '<div class="search-result__main">';
        if (r.type === 'vocab') {
          html += '<span class="search-result__jp">' + ruby(r.jp, r.furigana) + '</span>';
        } else if (r.type === 'kanji') {
          html += '<span class="search-result__kanji">' + esc(r.jp) + '</span>';
        } else if (r.type === 'grammar') {
          html += '<span class="search-result__grammar">' + esc(r.jp) + '</span>';
        } else {
          html += '<span class="search-result__lesson">' + txt('Lesson ' + r.number, 'পাঠ ' + r.number) + '</span>';
          html += '<span class="search-result__lesson-title">' + txt(r.title.en, r.title.bn) + '</span>';
        }
        html += '</div>';

        html += '<div class="search-result__meta">';
        if (r.type !== 'lesson') {
          html += '<span class="search-result__meaning">' + txt(r.en, r.bn) + '</span>';
          if (r.romaji) html += '<span class="search-result__romaji">' + esc(r.romaji) + '</span>';
        }
        html += '</div>';

        html += '<div class="search-result__lesson-tag"><span class="badge badge--outline">L' + r.number + '</span></div>';
        html += '</a></li>';
      });
      html += '</ul></section>';
    });
    resultsEl.innerHTML = html;
  }

  // ---------- init ----------
  function init() {
    var input = document.getElementById('search-input');
    var clearBtn = document.getElementById('search-clear');
    if (!input) return;

    var q0 = new URLSearchParams(location.search).get('q') || '';
    if (q0) input.value = q0;
    clearBtn.hidden = !input.value;

    var run = debounce(function () {
      var q = input.value.trim();
      state.q = q;
      clearBtn.hidden = !q;
      render(q);
      var u = new URL(location.href);
      if (q) u.searchParams.set('q', q); else u.searchParams.delete('q');
      history.replaceState(null, '', u.toString());
    }, 120);

    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        input.value = '';
        run();
      }
    });
    clearBtn.addEventListener('click', function () {
      input.value = '';
      input.focus();
      run();
    });

    // pre-fill from shell search
    document.addEventListener('shell:search', function (e) {
      if (e.detail && typeof e.detail.q === 'string' && e.detail.q !== input.value) {
        input.value = e.detail.q;
        run();
      }
    });

    // static bilingual texts get swapped by shell automatically.
    // focus so users can start typing immediately.
    input.focus();

    // Build index — done once, cached thereafter.
    render(input.value.trim());
    buildIndex().then(function () {
      render(input.value.trim());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
