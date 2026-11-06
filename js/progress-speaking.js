(function () {
  var LOGK = 'nihongo_speak_log', METAK = 'nihongo_speak_meta', lastSig = '';
  function lang() { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
  function T(en, bn) { return '<span data-en="' + en + '" data-bn="' + bn + '">' + (lang() === 'bn' ? bn : en) + '</span>'; }
  function jget(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function dayStr(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function render() {
    var main = document.querySelector('main.shell-main') || document.querySelector('main');
    if (!main) return;
    var lg = jget(LOGK, {}), meta = jget(METAK, {});
    var sig = localStorage.getItem(LOGK) + '|' + localStorage.getItem(METAK) + '|' + lang();
    if (sig === lastSig && document.getElementById('pg-speak')) return;
    lastSig = sig;

    var now = new Date(), t = dayStr(now), y = new Date(); y.setDate(y.getDate() - 1);
    var cur = (meta.streakLastDay === t || meta.streakLastDay === dayStr(y)) ? (meta.streakCurrent || 0) : 0;
    var longest = Math.max(meta.streakLongest || 0, cur);
    var total = 0, k;
    for (k in lg) total += lg[k] || 0;
    var days = [], max = 1, i, d, s;
    for (i = 6; i >= 0; i--) {
      d = new Date(); d.setDate(d.getDate() - i);
      s = lg[dayStr(d)] || 0;
      days.push({ d: d, s: s });
      if (s > max) max = s;
    }
    var letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    var bars = days.map(function (x) {
      var h = x.s ? Math.max(Math.round(x.s / max * 100), 6) : 2;
      return '<div class="pg-speak__bar"><div class="pg-speak__track"><div class="pg-speak__fill" style="height:' + h + '%"></div></div><span>' + letters[x.d.getDay()] + '</span></div>';
    }).join('');

    var box = document.getElementById('pg-speak');
    if (!box) { box = document.createElement('section'); box.id = 'pg-speak'; box.className = 'pg-speak'; main.appendChild(box); }
    var todayMin = Math.floor((lg[t] || 0) / 60), totalMin = Math.floor(total / 60);
    box.innerHTML =
      '<h2>' + T('Speaking practice', 'স্পিকিং অনুশীলন') + '</h2>' +
      '<div class="pg-speak__grid">' +
        '<div class="pg-speak__stat"><strong>' + todayMin + '</strong><span>' + T('min today', 'মিনিট আজ') + '</span></div>' +
        '<div class="pg-speak__stat"><strong>' + cur + '</strong><span>' + T('day streak', 'দিনের ধারা') + '</span></div>' +
        '<div class="pg-speak__stat"><strong>' + longest + '</strong><span>' + T('longest streak', 'সর্বোচ্চ ধারা') + '</span></div>' +
        '<div class="pg-speak__stat"><strong>' + totalMin + '</strong><span>' + T('min total', 'মিনিট মোট') + '</span></div>' +
      '</div>' +
      '<div class="pg-speak__bars" aria-hidden="true">' + bars + '</div>' +
      '<a class="pg-speak__go" href="tutor.html">' + T('Practice speaking', 'স্পিকিং অনুশীলন করুন') + '</a>';
  }

  render();
  setInterval(render, 4000);
  window.addEventListener('storage', render);
})();
