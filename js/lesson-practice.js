(function () {
  'use strict';
  function bn() { return (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(en, b) { return '<span data-en="' + esc(en) + '" data-bn="' + esc(b || en) + '">' + esc(bn() ? (b || en) : en) + '</span>'; }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-opt]');
    if (!btn) return;
    var card = btn.closest('.lv-item[data-q]');
    if (!card || card.getAttribute('data-scored')) return;
    var q;
    try { q = state.data.practice[+card.getAttribute('data-q')]; } catch (err) { return; }
    if (!q) return;
    var ok = btn.getAttribute('data-correct') === 'true';
    card.setAttribute('data-scored', ok ? '1' : '0');
    card.querySelectorAll('[data-opt]').forEach(function (b) {
      if (+b.getAttribute('data-opt') === q.correctIndex) b.classList.add('is-correct');
      else if (b === btn) b.classList.add('is-wrong');
      b.style.color = ''; b.style.borderColor = '';
    });
    var fb = card.querySelector('[data-feedback]');
    if (fb) {
      var ex = q.explanation || {};
      fb.hidden = false; fb.style.color = '';
      fb.className = 'lq-fb ' + (ok ? 'is-ok' : 'is-bad');
      fb.innerHTML = '<strong>' + (ok ? '\u2713 ' + t('Correct', 'সঠিক') : '\u2717 ' + t('Incorrect', 'ভুল')) + '</strong>' +
        (ex.en || ex.bn ? ' \u2014 ' + t(ex.en || '', ex.bn || ex.en || '') : '');
    }
    var panel = document.getElementById('lv-panel');
    if (!panel) return;
    var all = panel.querySelectorAll('.lv-item[data-q]');
    var done = panel.querySelectorAll('.lv-item[data-q][data-scored]');
    var right = panel.querySelectorAll('.lv-item[data-q][data-scored="1"]');
    if (done.length !== all.length) return;
    var box = panel.querySelector('.lp-score');
    if (!box) {
      box = document.createElement('div');
      box.className = 'lp-score'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      panel.appendChild(box);
    }
    box.innerHTML = '<p class="lp-score__n">' + t('Score: ' + right.length + ' / ' + all.length, 'স্কোর: ' + right.length + ' / ' + all.length) + '</p>' +
      '<button type="button" class="btn btn--secondary lp-retry">' + t('Try again', 'আবার চেষ্টা করুন') + '</button>';
    box.querySelector('.lp-retry').addEventListener('click', function () { try { renderPanel(); window.scrollTo({ top: 0 }); } catch (err) {} });
    if (window.Toast && right.length === all.length) window.Toast.show('Perfect score!', 'পুরো নম্বর!', { type: 'ok' });
  });
})();
