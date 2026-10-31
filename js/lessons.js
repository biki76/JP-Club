(function () {
  'use strict';
  var TOTAL = 50;
  var grid = document.getElementById('ls-grid');
  var resume = document.getElementById('ls-resume');
  var filter = 'all';
  var manifests = {};
  var progress = null;
  var LS_STATUS = null;
  var BAD = /^(placeholder|draft|scaffold|planned|coming|coming-soon|soon|empty|pending|todo|none|locked)$/i;
  function isPlaceholder(m, n) {
    var key = 'minna-' + String(n).padStart(3, '0');
    var e = LS_STATUS && (LS_STATUS[key] || (LS_STATUS.lessons && LS_STATUS.lessons[key]));
    if (e !== undefined && e !== null) {
      if (typeof e === 'string') return BAD.test(e);
      if (typeof e === 'object') {
        if (e.ready === false || e.complete === false || e.published === false) return true;
        var v = e.status || e.state || e.content;
        if (typeof v === 'string') return BAD.test(v);
      }
      return false;
    }
    var t = m && m.title && m.title.en;
    return !!t && /^Lesson \d+$/.test(t) && n > 2;
  }

  function txt(en, bn) {
    var l = document.documentElement.lang === 'bn' ? 'bn' : 'en';
    return '<span data-en="' + esc(en) + '" data-bn="' + esc(bn) + '">' + esc(l === 'bn' ? bn : en) + '</span>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function slug(n) { return 'minna-' + String(n).padStart(3, '0'); }
  function jlpt(n) { return n <= 25 ? 'N5' : 'N4'; }
  function bnNum(n) { return String(n).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }

  function readProgress() {
    try { progress = JSON.parse(localStorage.getItem('nihongo_progress') || 'null'); } catch (e) { progress = null; }
  }

  function ring(p) {
    return '<span class="ls-ring" aria-hidden="true"><svg class="v2-ring" viewBox="0 0 50 50" style="--p:' + p + '">' +
      '<circle class="bg" cx="25" cy="25" r="22"/><circle class="fg" cx="25" cy="25" r="22"/></svg></span>';
  }

  function cardFor(n) {
    var s = slug(n);
    var m = manifests[s];
    var available = !!m && !isPlaceholder(m, n);
    var done = progress && n <= (progress.completedLessons || 0);
    var current = progress && n === progress.currentLesson;
    var p = done ? 1 : (current ? (progress.currentLessonProgress || 0) : 0);
    var title = m ? m.title : { en: 'Lesson ' + n, bn: 'পাঠ ' + bnNum(n) };
    var level = (m && m.jlpt) || jlpt(n);
    var tag = available ? 'a' : 'div';
    var attrs = available
      ? ' href="lesson.html?lesson=' + s + '"'
      : ' aria-disabled="true"';
    var state = done
      ? '<span class="ls-state ls-state--done"><span aria-hidden="true">✓</span>' + txt('Done', 'শেষ') + '</span>'
      : available
        ? '<span class="ls-state">' + txt(current ? 'In progress' : 'Start', current ? 'চলমান' : 'শুরু') + '</span>'
        : '<span class="ls-state ls-state--soon"><span aria-hidden="true">🔒</span>' + txt('Coming soon', 'শীঘ্রই আসছে') + '</span>';
    return '<' + tag + ' class="ls-card v2-reveal' + (current ? ' ls-card--current' : '') + '" data-level="' + level + '" data-available="' + available + '"' + attrs + '>' +
      '<div class="ls-top"><span class="ls-num">' + n + '</span>' + (available ? ring(p) : '') + '</div>' +
      '<div><div class="ls-title">' + txt(title.en, title.bn) + '</div>' +
      (m && m.subtitle ? '<div class="ls-sub">' + txt(m.subtitle.en, m.subtitle.bn) + '</div>' : '') + '</div>' +
      '<div class="ls-foot"><span class="ls-jlpt">' + level + '</span>' + state + '</div>' +
      '</' + tag + '>';
  }

  function render() {
    var out = [];
    for (var n = 1; n <= TOTAL; n++) {
      var lvl = (manifests[slug(n)] && manifests[slug(n)].jlpt) || jlpt(n);
      var avail = !!manifests[slug(n)] && !isPlaceholder(manifests[slug(n)], n);
      if (filter === 'all' || filter === lvl || (filter === 'available' && avail)) out.push(cardFor(n));
    }
    grid.innerHTML = out.length ? out.join('') : '<div class="ls-empty">' + txt('No lessons match.', 'কোনো পাঠ মেলেনি।') + '</div>';
    grid.setAttribute('aria-busy', 'false');
    grid.querySelectorAll('.v2-reveal').forEach(function (el, i) { el.style.setProperty('--i', Math.min(i % 12, 6)); el.classList.add('is-in'); });
    grid.querySelectorAll('.v2-ring').forEach(function (s) {
      var p = parseFloat(s.style.getPropertyValue('--p')) || 0;
      s.style.setProperty('--p', 0);
      requestAnimationFrame(function () { s.style.setProperty('--p', p); });
    });
    var ev = document.createEvent('Event'); ev.initEvent('shell:i18n-refresh', true, true); document.dispatchEvent(ev);
  }

  function renderResume() {
    var n = progress && progress.currentLesson ? progress.currentLesson : 1;
    var has = !!manifests[slug(n)] && !isPlaceholder(manifests[slug(n)], n);
    if (!has) { n = 1; }
    resume.innerHTML = '<a class="v2-card" href="lesson.html?lesson=' + slug(n) + '">' +
      '<div><div class="v2-card__desc">' + txt(progress ? 'Resume' : 'Start here', progress ? 'চালিয়ে যান' : 'এখান থেকে শুরু') + '</div>' +
      '<div class="v2-card__title" style="margin-top:4px">' + txt('Lesson ' + n, 'পাঠ ' + bnNum(n)) + '</div></div>' +
      '<span class="v2-btn v2-btn--primary" aria-hidden="true">' + txt('Go', 'চলুন') + '</span></a>';
  }

  document.querySelectorAll('.ls-chip').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      document.querySelectorAll('.ls-chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    });
  });

  window.addEventListener('storage', function (e) { if (e.key === 'nihongo_progress') { readProgress(); renderResume(); render(); } });

  async function init() {
    readProgress();
    // skeleton to reserve space
    grid.innerHTML = new Array(12).join('<div class="v2-skel" style="min-height:168px"></div>');
    try {
      var course = await DataLoader.loadCourse();
      (course.lessons || []).forEach(function (m) { manifests[m.slug] = m; });
    } catch (e) { /* offline or missing: show locked grid */ }
    try { var r = await fetch('data/lessons/status.json'); if (r.ok) LS_STATUS = await r.json(); } catch (e) {}
    renderResume();
    render();
  }

  if (window.DataLoader) init();
  else window.addEventListener('load', init);
})();
