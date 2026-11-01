// qwen: tracks — Mimikara flip cards / Shin Kanzen reveal points
(function () {
  var track = document.body.getAttribute('data-track');
  var list = document.getElementById('track-list');
  var status = document.getElementById('track-status');
  if (!track || !list) return;

  function span(en, bn, cls) {
    var s = document.createElement('span');
    if (cls) s.className = cls;
    s.setAttribute('data-en', en);
    s.setAttribute('data-bn', bn);
    s.textContent = en;
    return s;
  }

  function renderMimikara(units) {
    var total = 0;
    units.forEach(function (u) {
      var wrap = document.createElement('section');
      var h = document.createElement('h2');
      h.className = 'tr-unit';
      h.appendChild(span('Unit ' + u.unit + ': ' + (u.title_en || ''), 'ইউনিট ' + u.unit + ': ' + (u.title_bn || '')));
      wrap.appendChild(h);
      var grid = document.createElement('div');
      grid.className = 'tr-grid';
      (u.words || []).forEach(function (w) {
        total++;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'track-card';
        b.setAttribute('aria-pressed', 'false');
        var f = document.createElement('span');
        f.className = 'card-front';
        f.lang = 'ja';
        f.textContent = w.jp;
        var back = document.createElement('span');
        back.className = 'card-back';
        back.appendChild(document.createTextNode(w.reading + ' · '));
        back.appendChild(span(w.en, w.bn));
        b.appendChild(f);
        b.appendChild(back);
        b.addEventListener('click', function () {
          var on = b.classList.toggle('flipped');
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
      list.appendChild(wrap);
    });
    if (status) {
      status.appendChild(span(total + ' words in this track', 'এই ট্র্যাকে ' + total + ' টি শব্দ'));
    }
  }

  function renderShinkanzen(points) {
    points.forEach(function (p) {
      var card = document.createElement('article');
      card.className = 'tr-point';
      var jp = document.createElement('h2');
      jp.className = 'tr-point-jp';
      jp.lang = 'ja';
      jp.textContent = p.point_jp;
      var en = document.createElement('p');
      en.className = 'tr-point-en';
      en.appendChild(span(p.point_en, p.point_bn));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tr-reveal';
      btn.appendChild(span('Show explanation', 'ব্যাখ্যা দেখুন'));
      var expl = document.createElement('p');
      expl.className = 'tr-expl';
      expl.hidden = true;
      expl.appendChild(span(p.explanation_en, p.explanation_bn));
      var ex = document.createElement('p');
      ex.className = 'tr-ex';
      ex.lang = 'ja';
      ex.hidden = true;
      ex.textContent = p.example_jp;
      btn.addEventListener('click', function () {
        var show = expl.hidden;
        expl.hidden = !show;
        ex.hidden = !show;
        btn.innerHTML = '';
        btn.appendChild(show ? span('Hide explanation', 'ব্যাখ্যা লুকান') : span('Show explanation', 'ব্যখ্যা দেখুন'));
      });
      card.appendChild(jp); card.appendChild(en); card.appendChild(btn); card.appendChild(expl); card.appendChild(ex);
      list.appendChild(card);
    });
    if (status) status.appendChild(span(points.length + ' grammar points', points.length + ' টি ব্যাকরণ পয়েন্ট'));
  }

  fetch('content/' + track + '/index.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (j) {
    list.innerHTML = '';
    if (!Array.isArray(j) || !j.length) {
      list.appendChild(span('No content yet', 'এখনো কোনো কন্টেন্ট নেই', 'tr-empty'));
      return;
    }
    if (track === 'mimikara') renderMimikara(j);
    else renderShinkanzen(j);
  }).catch(function () {
    list.innerHTML = '';
    list.appendChild(span('No content yet', 'এখনো কোনো কন্টেন্ট নেই', 'tr-empty'));
  });
})();
