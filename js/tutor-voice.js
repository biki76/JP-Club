(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var $ = function (id) { return document.getElementById(id); };
  var orb = $('tv-orb'), statusEl = $('tv-status'), log = $('tv-log');
  var levelEl = $('tv-level'), rateEl = $('tv-rate'), input = $('tv-input');
  var history = [], rec = null, active = false, busy = false, lastReply = '';
  var epoch = 0, retries = 0, wake = null, pending = 0, revealTimer = null, botSpans = [], lastInterim = '';
  var topic = localStorage.getItem('nihongo_tutor_topic') || 'free';
  var LOGK = 'nihongo_speak_log', METAK = 'nihongo_speak_meta', GOAL = 60;
  var TOPIC_LABEL = {
    free: ['Free talk', 'ফ্রি আলাপ'], intro: ['Introductions', 'পরিচয়'], food: ['Food', 'খাবার'],
    travel: ['Travel', 'ভ্রমণ'], shop: ['Shopping', 'কেনাকাটা']
  };

  function lang() { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
  function T(en, bn) {
    return '<span data-en="' + en + '" data-bn="' + bn + '">' + (lang() === 'bn' ? bn : en) + '</span>';
  }

  /* ---------- live overlay ---------- */
  function ICON(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var I_KB = ICON('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>');
  var I_REPLAY = ICON('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>');
  var I_MIC = ICON('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>');
  var I_X = ICON('<path d="M18 6 6 18M6 6l12 12"/>');
  var I_SEND = ICON('<path d="M5 12h14M13 6l6 6-6 6"/>');
  function btn(id, svg, en, bn) {
    return '<button type="button" class="tl-icon" id="' + id + '" aria-label="' + en + '" data-aria-label-en="' + en + '" data-aria-label-bn="' + bn + '">' + svg + '</button>';
  }
  var live = document.createElement('div');
  live.className = 'tl'; live.id = 'tl'; live.hidden = true; live.setAttribute('data-state', 'idle');
  live.setAttribute('role', 'dialog'); live.setAttribute('aria-modal', 'true'); live.setAttribute('aria-label', 'Live conversation');
  live.innerHTML =
    '<div class="tl-top" id="tl-topic"></div>' +
    '<div class="tl-stage" aria-live="polite"><div class="tl-bot" id="tl-bot" lang="ja"></div><div class="tl-tr" id="tl-tr"></div><div class="tl-fix" id="tl-fix" hidden></div></div>' +
    '<div class="tl-hint"><span class="tl-status" id="tl-status"></span><button type="button" class="tl-pill" id="tl-pill" hidden>' + T('Tap to interrupt', 'থামিয়ে বলতে ট্যাপ করুন') + '</button></div>' +
    '<div class="tl-me" id="tl-me" lang="ja" hidden></div>' +
    '<div class="tl-typebox" id="tl-typebox" hidden><input id="tl-input" class="tl-input" lang="ja" placeholder="\u65e5\u672c\u8a9e\u3067\u5165\u529b\u2026" aria-label="Type in Japanese">' + btn('tl-send', I_SEND, 'Send', 'পাঠান') + '</div>' +
    '<div class="tl-bar">' + btn('tl-type', I_KB, 'Type', 'টাইপ করুন') + btn('tl-repeat', I_REPLAY, 'Repeat', 'আবার শুনুন') +
    '<div class="tl-orb" id="tl-orb" aria-hidden="true"></div>' +
    btn('tl-mic', I_MIC, 'Microphone', 'মাইক্রোফোন') + btn('tl-end', I_X, 'End conversation', 'শেষ করুন') + '</div>';
  document.body.appendChild(live);

  function setState(s, en, bn) {
    orb.setAttribute('data-state', s);
  function renderStats() {
    var lg = jget(LOGK, {});
    var meta = jget(METAK, { streakCurrent: 0, streakLastDay: '' });
    var t = dayStr(), y = new Date(); y.setDate(y.getDate() - 1);
    var mins = Math.floor(((lg[t] || 0) + pending) / 60);
    var cur = (meta.streakLastDay === t  meta.streakLastDay === dayStr(y)) ? (meta.streakCurrent  0) : 0;
    var today = $('tv-today'), st = $('tv-streak');
if (today) today.innerHTML = T('Today: ' + mins + ' min', 'আজ: ' + mins + ' মিনিট');
    if (st) st.innerHTML = T('Streak: ' + cur + ' day' + (cur === 1 ? '' : 's'), 'ধারা: ' + cur + ' দিন');
  }
  setInterval(function () { if (active && !document.hidden) { pending++; if (pending >= 10) flush(); } }, 1000);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });

  /* ---------- screen wake lock ---------- */
  async function keepAwake(on) {
    try {
      if (on && navigator.wakeLock && !wake) {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', function () { wake = null; });
      } else if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) {}
  }

  /* ---------- speech out (with word reveal) ---------- */
  function speakText(text, rate, done, onBoundary, onStart) {
    done = done || function () {};
    if (!('speechSynthesis' in window)) { done(); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = rate;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^ja/i.test(x.lang); })[0];
    if (v) u.voice = v;
    if (onBoundary) u.onboundary = onBoundary;
    if (onStart) u.onstart = onStart;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  }
  function revealTo(ci) { for (var i = 0; i < botSpans.length; i++) { if (botSpans[i]._p <= ci) botSpans[i].classList.add('on'); } }
  function revealAll() { revealTo(1e9); }
  function stopReveal() { if (revealTimer) { clearInterval(revealTimer); revealTimer = null; } }
  function speakBot(text, done) {
    var rate = parseFloat(rateEl.value) || 0.85, gotB = false, fin = false;
    stopReveal();
    speakText(text, rate,
      function () { fin = true; stopReveal(); revealAll(); done(); },
      function (e) { gotB = true; revealTo(e.charIndex || 0); },
      function () {
      el.appendChild(w);
    });
  }
  function goodSegs(segs, text) {
    if (!Array.isArray(segs) || !segs.length) return null;
    return segs.map(function (s) { return s.t; }).join('') === text ? segs : null;
  }
  function fixEl(fix) {
    var c = document.createElement('div'); c.className = 'tv-fix';
    var s = document.createElement('s'); s.lang = 'ja'; s.textContent = fix.said || '';
    var g = document.createElement('strong'); g.lang = 'ja'; renderSegs(g, plainSegs(fix.better));
    c.appendChild(s); c.appendChild(document.createTextNode('  \u2192  ')); c.appendChild(g);
    if (fix.why) { var w = document.createElement('div'); w.textContent = fix.why; c.appendChild(w); }
    return c;
  }

  function addLine(cls, jp, tr, fix, segs) {
    var d = document.createElement('div');
    d.className = 'tv-line ' + cls;
    var a = document.createElement('div'); a.className = 'tv-jp'; a.lang = 'ja';
    renderSegs(a, goodSegs(segs, jp) || plainSegs(jp));
    d.appendChild(a);
    if (tr) { var b = document.createElement('div'); b.className = 'tv-tr'; b.textContent = tr; d.appendChild(b); }
    if (fix && fix.better) d.appendChild(fixEl(fix));
    log.appendChild(d);
  }
  function setBot(reply, segs, tr, fix) {
    var bot = $('tl-bot'); bot.innerHTML = ''; botSpans = [];
    renderSegs(bot, goodSegs(segs, reply) || plainSegs(reply), botSpans);
    $('tl-tr').textContent = tr || '';
    var f = $('tl-fix'); f.innerHTML = '';
    if (fix && fix.better) { f.appendChild(fixEl(fix)); f.hidden = false; } else { f.hidden = true; }
    $('tl-bot').parentNode.scrollTop = 0;
  }

  /* ---------- backend ---------- */
  async function token() {
    var c = window.__sb, n = 0;
    while (!(c && c.auth) && n++ < 30) { await new Promise(function (r) { setTimeout(r, 150); }); c = window.__sb; }
if (!c) throw new Error('Not ready. Please refresh the page.');
    var r = await c.auth.getSession();
    if (!r.data || !r.data.session) throw new Error('SIGNIN');
    return r.data.session.access_token;
  }
  async function ask(text, start) {
    var cfg = window.SUPABASE_CONFIG || {};
    var tk = await token();
    var res = await fetch(cfg.url + '/functions/v1/voice-tutor', {
    if (active) { stopAll(); return; }
    if (busy) return;
    startSession();
  });
  $('tl-end').addEventListener('click', endSession);
  $('tl-mic').addEventListener('click', micToggle);
  $('tl-pill').addEventListener('click', interrupt);
  $('tl-repeat').addEventListener('click', repeatBot);
  $('tl-type').addEventListener('click', function () {
    var tb = $('tl-typebox'); tb.hidden = !tb.hidden;
    if (!tb.hidden) $('tl-input').focus();
  });
  $('tl-send').addEventListener('click', function () { sendFrom($('tl-input')); });
  $('tl-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendFrom($('tl-input')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !live.hidden) endSession(); });

  $('tv-send').addEventListener('click', function () { sendFrom(input); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendFrom(input); });
  $('tv-repeat').addEventListener('click', repeatBot);
  $('tv-reset').addEventListener('click', function () {
    stopAll(); history = []; lastReply = ''; log.innerHTML = '';
    $('tl-bot').innerHTML = ''; $('tl-tr').textContent = ''; $('tl-fix').hidden = true; botSpans = []; showMe('');
  });

  var topicBtns = document.querySelectorAll('.tv-topic');
  function markTopic() {
    for (var i = 0; i < topicBtns.length; i++) {
      topicBtns[i].setAttribute('aria-pressed', topicBtns[i].getAttribute('data-topic') === topic ? 'true' : 'false');
    }
  }
  for (var i = 0; i < topicBtns.length; i++) {
    topicBtns[i].addEventListener('click', function () {
      topic = this.getAttribute('data-topic');
      localStorage.setItem('nihongo_tutor_topic', topic);
      markTopic();
      stopAll(); history = []; lastReply = ''; log.innerHTML = '';
      $('tl-bot').innerHTML = ''; $('tl-tr').textContent = ''; $('tl-fix').hidden = true; botSpans = []; showMe('');
      startSession();
    });
  }
  markTopic();
  renderStats();
  setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
})();
