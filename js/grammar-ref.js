// grammar-ref — renders data/grammar/index.json (built by tools/build-data.mjs).
// Paged (40 at a time), debounced filter, per-card "more examples" loaded lazily from the lesson chunk.
// Needs js/data-chunks.js loaded before this file.
(function () {
  'use strict';

  var PAGE = 40;
  var list = document.getElementById('gr-list');
  var filter = document.getElementById('gr-filter');
  var items = [], matches = [], shown = 0, timer = null;
  var moreBtn = null;

  function bn() { return document.documentElement.lang === 'bn'; }
  function txt(tag, cls, en, b) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    el.setAttribute('data-en', en); el.setAttribute('data-bn', b);
    el.textContent = bn() ? b : en;
    return el;
  }

  function loadExamples(it, card, btn) {
    btn.disabled = true;
    window.DataChunks.grammar.lesson(it.lesson).then(function (chunk) {
      var full = (chunk.items || []).filter(function (g) { return g.id === it.id; })[0];
      var exs = full && full.examples ? full.examples.slice(1) : [];
      btn.remove();
      exs.forEach(function (e) {
        var p = document.createElement('p'); p.className = 'gr-ex'; p.lang = 'ja'; p.textContent = e.jp;
        var tr = document.createElement('p'); tr.className = 'gr-en';
        tr.setAttribute('data-en', e.en || ''); tr.setAttribute('data-bn', e.bn || e.en || '');
        tr.textContent = bn() ? (e.bn || e.en || '') : (e.en || '');
        card.appendChild(p); card.appendChild(tr);
      });
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = bn() ? 'লোড হয়নি — আবার চেষ্টা করুন' : 'Could not load — retry';
    });
  }

  function row(it) {
    var card = document.createElement('article');
    card.className = 'gr-card';
    card.appendChild(txt('span', 'gr-lesson', 'Lesson ' + it.lesson, 'পাঠ ' + it.lesson));
    var h = document.createElement('h2'); h.className = 'gr-jp'; h.lang = 'ja'; h.textContent = it.jp || '';
    var r = document.createElement('p'); r.className = 'gr-romaji'; r.textContent = it.romaji || '';
    var en = document.createElement('p'); en.className = 'gr-en';
    en.setAttribute('data-en', it.en || ''); en.setAttribute('data-bn', it.bn || it.en || '');
    en.textContent = bn() ? (it.bn || it.en || '') : (it.en || '');
    var ex = document.createElement('p'); ex.className = 'gr-ex'; ex.lang = 'ja'; ex.textContent = it.example || '';
    card.appendChild(h); card.appendChild(r); card.appendChild(en); card.appendChild(ex);
    if ((it.n || 1) > 1) {
      var btn = txt('button', 'gr-more', 'More examples (' + (it.n - 1) + ')', 'আরও উদাহরণ (' + (it.n - 1) + ')');
      btn.type = 'button';
      btn.addEventListener('click', function () { loadExamples(it, card, btn); });
      card.appendChild(btn);
    }
    return card;
  }

  function showMore() {
    var frag = document.createDocumentFragment();
    matches.slice(shown, shown + PAGE).forEach(function (it) { frag.appendChild(row(it)); });
    shown = Math.min(matches.length, shown + PAGE);
    if (moreBtn) moreBtn.remove();
    list.appendChild(frag);
    if (shown < matches.length) {
      moreBtn = txt('button', 'gr-more gr-more--page', 'Show more (' + (matches.length - shown) + ' left)', 'আরও দেখুন (' + (matches.length - shown) + 'টি বাকি)');
      moreBtn.type = 'button';
      moreBtn.addEventListener('click', showMore);
      list.appendChild(moreBtn);
    }
  }

  function render(q) {
    q = (q || '').trim().toLowerCase();
    list.textContent = ''; moreBtn = null; shown = 0;
    matches = items.filter(function (it) {
      return !q || ((it.jp || '') + ' ' + (it.en || '') + ' ' + (it.bn || '') + ' ' + (it.romaji || '')).toLowerCase().indexOf(q) > -1;
    });
    if (!matches.length) { list.appendChild(txt('p', 'gr-empty', 'No matches', 'কিছু মেলেনি')); return; }
    showMore();
  }

  function fail() {
    list.textContent = '';
    var p = txt('p', 'gr-empty', 'Could not load grammar data. Check your connection.', 'ব্যাকরণ ডেটা লোড করা যায়নি। সংযোগ দেখুন।');
    var b = txt('button', 'gr-more', 'Retry', 'আবার চেষ্টা');
    b.type = 'button'; b.addEventListener('click', start);
    list.appendChild(p); list.appendChild(b);
  }

  function start() {
    window.DataChunks.grammar.index().then(function (idx) {
      items = Array.isArray(idx.items) ? idx.items : [];
      render(filter ? filter.value : '');
    }).catch(fail);
  }

  if (filter) filter.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { render(filter.value); }, 120);
  });
  start();
})();
