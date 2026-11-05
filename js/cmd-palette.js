// qwen: cmd-palette — Cmd/Ctrl+K or "/" opens; mobile sheet; shell:search navigates
(function () {
  var PAGES = [
    { href: 'lessons.html', en: 'All lessons', bn: 'সব পাঠ' },
    { href: 'flashcards.html', en: 'Flashcards', bn: 'ফ্ল্যাশকার্ড' },
    { href: 'tutor.html', en: 'AI Tutor', bn: 'এআই টিউটর' },
    { href: 'quiz.html', en: 'Quiz', bn: 'কুইজ' },
    { href: 'kanji.html', en: 'Kanji', bn: 'কানজি' },
    { href: 'progress.html', en: 'Progress', bn: 'অগ্রগতি' },
    { href: 'placement.html', en: 'Placement test', bn: 'প্লেসমেন্ট টেস্ট' },
    { href: 'mimikara.html', en: 'Mimikara Oboeru', bn: 'মিমিকারা ওবোয়েরু' },
    { href: 'shinkanzen.html', en: 'Shin Kanzen Master', bn: 'শিন কানজেন মাস্টার' },
  ];
  var lessons = [];
  fetch('content/index.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (j) {
    lessons = Array.isArray(j) ? j : Object.keys(j || {}).map(function (k) { return Object.assign({ slug: k }, j[k]); });
  }).catch(function () { lessons = []; });

  var wrap = document.createElement('div');
  wrap.className = 'cmd-palette-overlay';
  wrap.hidden = true;
  wrap.innerHTML =
    '<div class="cmd-palette" role="dialog" aria-modal="true" aria-label="Search">' +
    '<input type="search" class="cmd-palette-input" placeholder="Search lessons and pages…" data-en="Search lessons and pages…" data-bn="পাঠ ও পাতা খুঁজুন…" aria-label="Search">' +
    '<ul class="cmd-palette-list" role="listbox"></ul>' +
    '</div>';
  document.body.appendChild(wrap);
  var input = wrap.querySelector('input');
  var list = wrap.querySelector('ul');

  function row(en, bn, href) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    var s = document.createElement('span');
    s.setAttribute('data-en', en);
    s.setAttribute('data-bn', bn);
    s.textContent = en;
    b.appendChild(s);
    if (href) { b.addEventListener('click', function () { location.href = href; }); }
    else { b.disabled = true; }
    li.appendChild(b);
    return li;
  }

  function render(q) {
    q = (q || '').toLowerCase();
    list.innerHTML = '';
    PAGES.forEach(function (p) {
      if ((p.en + ' ' + p.bn).toLowerCase().indexOf(q) > -1) list.appendChild(row(p.en, p.bn, p.href));
    });
    lessons.filter(function (l) {
      return ((l.title || '') + ' ' + (l.title_bn || '') + ' ' + (l.slug || '')).toLowerCase().indexOf(q) > -1;
    }).slice(0, 8).forEach(function (l) {
      list.appendChild(row(l.title || l.slug, l.title_bn || l.slug, 'lesson.html?slug=' + encodeURIComponent(l.slug)));
    });
    if (!list.children.length) list.appendChild(row('No matches', 'কিছু মেলেনি', ''));
  }

  function open() { wrap.hidden = false; input.value = ''; render(''); input.focus(); }
  function close() { wrap.hidden = true; }

  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var first = list.querySelector('button:not([disabled])'); if (first) first.click(); }
  });
  wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); return; }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      e.preventDefault(); open();
    }
    if (e.key === 'Escape') close();
  });
  document.addEventListener('shell:search', function (e) {
    var d = e.detail;
    var q = typeof d === 'string' ? d : ((d && (d.query || d.q)) || '');
    location.href = q ? ('search.html?q=' + encodeURIComponent(q)) : 'search.html';
  });
})();
