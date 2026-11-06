(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var $ = function (id) { return document.getElementById(id); };
  var orb = $('tv-orb'), statusEl = $('tv-status'), log = $('tv-log');
  var levelEl = $('tv-level'), rateEl = $('tv-rate'), input = $('tv-input');
  var history = [], rec = null, active = false, busy = false, lastReply = '';
  var epoch = 0, retries = 0, wake = null, pending = 0;
  var topic = localStorage.getItem('nihongo_tutor_topic') || 'free';
  var LOGK = 'nihongo_speak_log', METAK = 'nihongo_speak_meta', GOAL = 60;

  function lang() { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
  function T(en, bn) {
    return '<span data-en="' + en + '" data-bn="' + bn + '">' + (lang() === 'bn' ? bn : en) + '</span>';
  }
  function setState(s, en, bn) {
    orb.setAttribute('data-state', s);
    statusEl.innerHTML = en ? T(en, bn) : '';
  }

  /* ---------- prefs ---------- */
  levelEl.value = localStorage.getItem('nihongo_tutor_level') || 'N5';
  rateEl.value = localStorage.getItem('nihongo_tutor_rate') || '0.85';
  levelEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_level', levelEl.value); });
  rateEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_rate', rateEl.value); });

  /* ---------- speaking time + streak ---------- */
  function dayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function jget(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function addSeconds(n) {
    var lg = jget(LOGK, {});
    var meta = jget(METAK, { totalSeconds: 0, streakCurrent: 0, streakLongest: 0, streakLastDay: '' });
    var t = dayStr(), before = lg[t] || 0;
    lg[t] = before + n;
    meta.totalSeconds = (meta.totalSeconds || 0) + n;
    if (before < GOAL && lg[t] >= GOAL) {
      var y = new Date(); y.setDate(y.getDate() - 1);
      if (meta.streakLastDay === dayStr(y)) meta.streakCurrent = (meta.streakCurrent || 0) + 1;
      else if (meta.streakLastDay !== t) meta.streakCurrent = 1;
      meta.streakLastDay = t;
      meta.streakLongest = Math.max(meta.streakLongest || 0, meta.streakCurrent);
    }
    localStorage.setItem(LOGK, JSON.stringify(lg));
    localStorage.setItem(METAK, JSON.stringify(meta));
    renderStats();
  }
  function flush() { if (pending > 0) { var n = pending; pending = 0; addSeconds(n); } }
  function renderStats() {
    var lg = jget(LOGK, {});
    var meta = jget(METAK, { streakCurrent: 0, streakLastDay: '' });
    var t = dayStr(), y = new Date(); y.setDate(y.getDate() - 1);
    var secs = (lg[t] || 0) + pending;
    var mins = Math.floor(secs / 60);
    var cur = (meta.streakLastDay === t || meta.streakLastDay === dayStr(y)) ? (meta.streakCurrent || 0) : 0;
    var today = $('tv-today'), st = $('tv-streak');
    if (today) today.innerHTML = T('Today: ' + mins + ' min', 'আজ: ' + mins + ' মিনিট');
    if (st) st.innerHTML = T('Streak: ' + cur + ' day' + (cur === 1 ? '' : 's'), 'ধারা: ' + cur + ' দিন');
  }
  setInterval(function () {
    if (active && !document.hidden) { pending++; if (pending >= 10) flush(); }
  }, 1000);
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

  /* ---------- speech out ---------- */
  function speakText(text, rate, done) {
    done = done || function () {};
    if (!('speechSynthesis' in window)) { done(); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = rate;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^ja/i.test(x.lang); })[0];
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  }
  function speak(text, done) { speakText(text, parseFloat(rateEl.value) || 0.85, done); }

  /* ---------- word rendering (tap to hear + furigana via <ruby>) ---------- */
  function hasKanji(s) { return /[\u4e00-\u9fff]/.test(s); }
  function isWord(s) { try { return /[\p{L}\p{N}]/u.test(s); } catch (e) { return /\S/.test(s); } }
  function plainSegs(text) {
    var out = [];
    try {
      var it = new Intl.Segmenter('ja', { granularity: 'word' }).segment(text)[Symbol.iterator](), n;
      while (!(n = it.next()).done) out.push({ t: n.value.segment, r: '' });
    } catch (e) { out = [{ t: text, r: '' }]; }
    return out;
  }
  function renderSegs(el, segs) {
    segs.forEach(function (s) {
      if (!isWord(s.t)) { el.appendChild(document.createTextNode(s.t)); return; }
      var w = document.createElement('span');
      w.className = 'tv-word'; w.lang = 'ja'; w.tabIndex = 0; w.setAttribute('role', 'button');
      var useR = s.r && hasKanji(s.t);
      if (useR) {
        var ru = document.createElement('ruby');
        ru.appendChild(document.createTextNode(s.t));
        var rt = document.createElement('rt'); rt.textContent = s.r; ru.appendChild(rt);
        w.appendChild(ru);
      } else { w.textContent = s.t; }
      var say = useR ? s.r : s.t;
      function go() { stopAll(); speakText(say, Math.min(parseFloat(rateEl.value) || 0.85, 0.8)); }
      w.addEventListener('click', go);
      w.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      el.appendChild(w);
    });
  }
  function goodSegs(segs, text) {
    if (!Array.isArray(segs) || !segs.length) return null;
    var joined = segs.map(function (s) { return s.t; }).join('');
    return joined === text ? segs : null;
  }

  function addLine(cls, jp, tr, fix, segs) {
    var d = document.createElement('div');
    d.className = 'tv-line ' + cls;
    var a = document.createElement('div'); a.className = 'tv-jp'; a.lang = 'ja';
    renderSegs(a, goodSegs(segs, jp) || plainSegs(jp));
    d.appendChild(a);
    if (tr) { var b = document.createElement('div'); b.className = 'tv-tr'; b.textContent = tr; d.appendChild(b); }
    if (fix && fix.better) {
      var c = document.createElement('div'); c.className = 'tv-fix';
      var s = document.createElement('s'); s.lang = 'ja'; s.textContent = fix.said || '';
      var g = document.createElement('strong'); g.lang = 'ja'; renderSegs(g, plainSegs(fix.better));
      c.appendChild(s); c.appendChild(document.createTextNode('  \u2192  ')); c.appendChild(g);
      if (fix.why) { var w = document.createElement('div'); w.textContent = fix.why; c.appendChild(w); }
      d.appendChild(c);
    }
    log.appendChild(d);
    d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tk, 'apikey': cfg.publishableKey || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, start: !!start, level: levelEl.value, topic: topic, lang: lang(), history: history })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function showError(e) {
    active = false; busy = false; keepAwake(false); flush();
    setState('idle');
    var d = document.createElement('div');
    d.className = 'tv-line bot tv-err';
    if (e.message === 'SIGNIN') d.innerHTML = T('Please sign in to use the tutor.', 'টিউটর ব্যবহার করতে সাইন ইন করুন।') + ' <a href="auth.html">' + T('Sign in', 'সাইন ইন') + '</a>';
    else d.textContent = e.message;
    log.appendChild(d);
  }

  /* ---------- conversation loop ---------- */
  async function turn(text, start) {
    var my = epoch;
    busy = true;
    setState('thinking', 'Thinking\u2026', 'ভাবছি\u2026');
    try {
      var r = await ask(text, start);
      if (my !== epoch) return;
      if (!start) history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: r.reply });
      lastReply = r.reply;
      addLine('bot', r.reply, r.translation, r.correction, r.segments);
      busy = false;
      setState('speaking', 'Speaking\u2026', 'বলছি\u2026');
      speak(r.reply, function () {
        if (my !== epoch) return;
        if (active) listen(); else setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
      });
    } catch (e) { if (my === epoch) showError(e); }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    addLine('me', text);
    turn(text, false);
  }

  function listen() {
    if (!SR) {
      active = false; keepAwake(false);
      setState('idle', 'Voice input is not supported in this browser. Type below.', 'এই ব্রাউজারে ভয়েস ইনপুট নেই। নিচে টাইপ করুন।');
      return;
    }
    var got = false, my = epoch;
    rec = new SR(); rec.lang = 'ja-JP'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) { got = true; retries = 0; send(e.results[0][0].transcript); };
    rec.onerror = function (e) {
      if (my !== epoch) return;
      if (e.error === 'no-speech' && active && retries < 2) { retries++; got = true; setTimeout(function () { if (my === epoch && active) listen(); }, 300); return; }
      active = false; keepAwake(false); flush();
      setState('idle', 'Could not hear you. Tap the mic to try again.', 'শুনতে পাইনি। আবার মাইক চাপুন।');
    };
    rec.onend = function () {
      if (my !== epoch) return;
      if (!got && active && !busy) {
        active = false; keepAwake(false); flush();
        setState('idle', 'Tap the mic to continue', 'চালিয়ে যেতে মাইক চাপুন');
      }
    };
    if (navigator.vibrate) navigator.vibrate(40);
    setState('listening', 'Your turn \u2014 speak now', 'আপনার পালা \u2014 এখন বলুন');
    try { rec.start(); } catch (e) { active = false; }
  }

  function stopAll() {
    epoch++; active = false; busy = false; retries = 0;
    try { if (rec) rec.abort(); } catch (e) {}
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    flush(); keepAwake(false);
    setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
  }

  function startSession() {
    active = true; retries = 0; keepAwake(true);
    if (history.length === 0) turn('', true); else listen();
  }

  /* ---------- controls ---------- */
  orb.addEventListener('click', function () {
    if (active) { stopAll(); return; }
    if (busy) return;
    startSession();
  });

  function sendTyped() {
    var t = input.value; input.value = '';
    if (rec) { epoch++; try { rec.abort(); } catch (e) {} }
    send(t);
  }
  $('tv-send').addEventListener('click', sendTyped);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendTyped(); });

  $('tv-repeat').addEventListener('click', function () { if (lastReply) { stopAll(); speak(lastReply, function () {}); } });
  $('tv-reset').addEventListener('click', function () { stopAll(); history = []; lastReply = ''; log.innerHTML = ''; });

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
      startSession();
    });
  }
  markTopic();
  renderStats();
  setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
})();
