(function () {
  'use strict';
  function bn() { return (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(en, b) { return '<span data-en="' + esc(en) + '" data-bn="' + esc(b || en) + '">' + esc(bn() ? (b || en) : en) + '</span>'; }
  function opt(o) { return typeof o === 'string' ? o : (o && (o.en || o.text || o.jp)) || ''; }

  function questionsFor(tab) {
    try {
      var list = (state.data && state.data[tab]) || [];
      var out = [];
      list.forEach(function (it) { (it.questions || []).forEach(function (q) { out.push(q); }); });
      return out;
    } catch (e) { return []; }
  }

  function build(qs, tab) {
    var box = document.createElement('section');
    box.className = 'lq-block';
    box.setAttribute('data-lq', tab);
    box.setAttribute('aria-label', bn() ? 'প্রশ্ন' : 'Questions');
    var answered = 0, right = 0;
    var head = document.createElement('h3');
    head.className = 'lq-title';
    head.innerHTML = t('Check your understanding', 'বুঝেছেন কিনা যাচাই করুন');
    box.appendChild(head);
    var score = document.createElement('p');
    score.className = 'lq-score'; score.setAttribute('role', 'status'); score.setAttribute('aria-live', 'polite');
    qs.forEach(function (q, qi) {
      var card = document.createElement('article');
      card.className = 'lq-card';
      var p = q.prompt || {};
      var h = document.createElement('p');
      h.className = 'lq-q';
      h.innerHTML = '<span class="lq-n">' + (qi + 1) + '.</span> ' + t(p.en || '', p.bn || p.en || '');
      card.appendChild(h);
      var wrap = document.createElement('div');
      wrap.className = 'lq-opts'; wrap.setAttribute('role', 'group');
      var fb = document.createElement('p');
      fb.className = 'lq-fb'; fb.setAttribute('role', 'status'); fb.hidden = true;
      (q.options || []).forEach(function (o, oi) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'lq-opt'; b.textContent = opt(o);
        b.addEventListener('click', function () {
          if (card.getAttribute('data-done')) return;
          card.setAttribute('data-done', '1');
          var ok = oi === q.correctIndex;
          answered++; if (ok) right++;
          wrap.querySelectorAll('.lq-opt').forEach(function (x, xi) {
            x.disabled = true;
            if (xi === q.correctIndex) x.classList.add('is-correct');
            else if (xi === oi) x.classList.add('is-wrong');
          });
          var ex = q.explanation || {};
          fb.hidden = false;
          fb.className = 'lq-fb ' + (ok ? 'is-ok' : 'is-bad');
          fb.innerHTML = '<strong>' + (ok ? '\u2713 ' + t('Correct', 'সঠিক') : '\u2717 ' + t('Incorrect', 'ভুল')) + '</strong>' +
            (ex.en || ex.bn ? ' \u2014 ' + t(ex.en || '', ex.bn || ex.en || '') : '');
          if (answered === qs.length) score.innerHTML = t('Score: ' + right + ' / ' + qs.length, 'স্কোর: ' + right + ' / ' + qs.length);
        });
        wrap.appendChild(b);
      });
      card.appendChild(wrap); card.appendChild(fb);
      box.appendChild(card);
    });
    box.appendChild(score);
    return box;
  }

  function run() {
    var tab; try { tab = state.tab; } catch (e) { return; }
    if (tab !== 'reading' && tab !== 'listening') return;
    var list = document.querySelector('.lv-list');
    if (!list || !list.parentNode) return;
    var host = list.parentNode;
    var cur = host.querySelector('.lq-block');
    if (cur && cur.getAttribute('data-lq') === tab) return;
    if (cur) cur.remove();
    var qs = questionsFor(tab);
    if (!qs.length) return;
    list.insertAdjacentElement('afterend', build(qs, tab));
  }
  run();
  var timer;
  new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(run, 120); })
    .observe(document.body, { childList: true, subtree: true });
})();
