(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var $ = function (id) { return document.getElementById(id); };
  var orb = $('tv-orb'), statusEl = $('tv-status');
  var levelEl = $('tv-level'), rateEl = $('tv-rate'), voiceEl = $('tv-voice'), bargeEl = $('tv-barge');
  var history = [], rec = null, barging = false, active = false, busy = false, lastReply = '';
  var epoch = 0, speakId = 0, retries = 0, wake = null, pending = 0, revealTimer = null, botSpans = [];
  var lastInterim = '', spokenIdx = 0, interrupted = false, session = null;
  var topic = localStorage.getItem('nihongo_tutor_topic') || 'free';
  var LOGK = 'nihongo_speak_log', METAK = 'nihongo_speak_meta', SESK = 'nihongo_tutor_sessions', GOAL = 60;
  var TOPIC_LABEL = {
    free: ['Free talk', 'ফ্রি আলাপ'], intro: ['Introductions', 'পরিচয়'], food: ['Food', 'খাবার'],
    travel: ['Travel', 'ভ্রমণ'], shop: ['Shopping', 'কেনাকাটা']
  };

  function lang() { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
  function T(en, bn) {
    return '<span data-en="' + en + '" data-bn="' + bn + '">' + (lang() === 'bn' ? bn : en) + '</span>';
  }
  function jget(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }

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

  function stateOf() { return live.getAttribute('data-state'); }
  function setState(s, en, bn) {
    orb.setAttribute('data-state', s);
    live.setAttribute('data-state', s);
    var html = en ? T(en, bn) : '';
    statusEl.innerHTML = html;
    $('tl-status').innerHTML = html;
    $('tl-status').hidden = s === 'speaking';
    $('tl-pill').hidden = s !== 'speaking';
    $('tl-mic').setAttribute('aria-pressed', s === 'listening' ? 'true' : 'false');
  }
  function openLive() {
    var l = TOPIC_LABEL[topic] || TOPIC_LABEL.free;
    $('tl-topic').innerHTML = 'Moon · ' + T(l[0], l[1]);
    live.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    $('tl-mic').focus();
  }
  function closeLive() { live.hidden = true; document.documentElement.style.overflow = ''; }
  function showMe(t) { var m = $('tl-me'); m.textContent = t || ''; m.hidden = !t; }
  function clearOverlay() {
    $('tl-bot').innerHTML = ''; $('tl-tr').textContent = ''; $('tl-fix').hidden = true; $('tl-fix').innerHTML = '';
    botSpans = []; showMe('');
  }

  /* ---------- prefs + voices ---------- */
  levelEl.value = localStorage.getItem('nihongo_tutor_level') || 'N5';
  rateEl.value = localStorage.getItem('nihongo_tutor_rate') || '0.85';
  bargeEl.checked = localStorage.getItem('nihongo_tutor_barge') !== 'off';
  levelEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_level', levelEl.value); });
  rateEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_rate', rateEl.value); });
  bargeEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_barge', bargeEl.checked ? 'on' : 'off'); });
  function jaVoices() {
    return ('speechSynthesis' in window ? speechSynthesis.getVoices() : []).filter(function (v) { return /^ja/i.test(v.lang); });
  }
  function fillVoices() {
    var keep = localStorage.getItem('nihongo_tutor_voice') || 'n:female';
    voiceEl.innerHTML = '';
    var g1 = document.createElement('optgroup'); g1.label = 'Natural (recommended)';
    [['n:female', 'Natural - Moon']].forEach(function (x) {
      var o = document.createElement('option'); o.value = x[0]; o.textContent = x[1]; g1.appendChild(o);
    });
    voiceEl.appendChild(g1);
    var g2 = document.createElement('optgroup'); g2.label = 'This device';
    var auto = document.createElement('option'); auto.value = 'b:'; auto.textContent = 'Device voice (auto)'; g2.appendChild(auto);
    jaVoices().forEach(function (v) { var o = document.createElement('option'); o.value = 'b:' + v.voiceURI; o.textContent = v.name; g2.appendChild(o); });
    voiceEl.appendChild(g2);
    voiceEl.value = keep;
    if (voiceEl.value !== keep) voiceEl.value = 'n:female';
  }
  fillVoices();
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices);
  voiceEl.addEventListener('change', function () {
    localStorage.setItem('nihongo_tutor_voice', voiceEl.value);
    speakId++; cancelVoice(); botSpans = [];
    speakBot('こんにちは。よろしくお願いします。', function () {});
  });
  function pickVoice() {
    var list = jaVoices(), sel = voiceEl.value.indexOf('b:') === 0 ? voiceEl.value.slice(2) : '', i;
    if (sel) { for (i = 0; i < list.length; i++) { if (list[i].voiceURI === sel) return list[i]; } }
    var best = null, score = -1;
    list.forEach(function (v) {
      var s = /natural|neural|online|premium|enhanced/i.test(v.name) ? 3 : (/google/i.test(v.name) ? 2 : 1);
      if (s > score) { score = s; best = v; }
    });
    return best;
  }

  /* ---------- speaking time + streak ---------- */
  function dayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
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
    var mins = Math.floor(((lg[t] || 0) + pending) / 60);
    var cur = (meta.streakLastDay === t || meta.streakLastDay === dayStr(y)) ? (meta.streakCurrent || 0) : 0;
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

  /* ---------- saved conversations ---------- */
  function loadSessions() { var a = jget(SESK, []); return Array.isArray(a) ? a : []; }
  function saveSessions(a) { try { localStorage.setItem(SESK, JSON.stringify(a.slice(0, 40))); } catch (e) {} }
  function persistSession() {
    var all = loadSessions(), i;
    for (i = 0; i < all.length; i++) { if (all[i].id === session.id) break; }
    if (i === all.length) all.unshift(session); else all[i] = session;
    saveSessions(all);
  }
  function addTurn(t) {
    if (!session) session = { id: Date.now(), at: Date.now(), topic: topic, level: levelEl.value, turns: [] };
    session.turns.push(t);
    if (session.turns.length > 80) session.turns.shift();
    persistSession();
  }

  /* ---------- speech out (with word reveal) ---------- */
  function speakText(text, rate, done, onBoundary, onStart) {
    done = done || function () {};
    if (!('speechSynthesis' in window)) { done(); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = rate; u.pitch = 1;
    var v = pickVoice();
    if (v) u.voice = v;
    if (onBoundary) u.onboundary = onBoundary;
    if (onStart) u.onstart = onStart;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  }
  function revealTo(ci) {
    if (ci < 1e8 && ci > spokenIdx) spokenIdx = ci;
    for (var i = 0; i < botSpans.length; i++) { if (botSpans[i]._p <= ci) botSpans[i].classList.add('on'); }
  }
  function revealAll() { revealTo(1e9); }
  function stopReveal() { if (revealTimer) { clearInterval(revealTimer); revealTimer = null; } }
  var player = null, neuralWarned = false;
  function neuralKey() { var v = voiceEl.value; return v.indexOf('n:') === 0 ? v.slice(2) : ''; }
  function cancelVoice() {
    if (player) { player.onended = null; player.onerror = null; try { player.pause(); } catch (e) {} player = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  async function fetchSpeech(text) {
    var cfg = window.SUPABASE_CONFIG || {};
    var tk = await token();
    var res = await fetch(cfg.url + '/functions/v1/voice-speak', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tk, 'apikey': cfg.publishableKey || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, voice: neuralKey(), rate: parseFloat(rateEl.value) || 0.9 })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.audio) throw new Error(data.error || ('HTTP ' + res.status));
    return data.audio;
  }
  function speakBot(text, done) {
    if (!neuralKey()) { speakBrowser(text, done); return; }
    var mySid = speakId;
    stopReveal();
    fetchSpeech(text).then(function (b64) {
      if (mySid !== speakId) return;
      var a = new Audio('data:audio/mp3;base64,' + b64);
      a.playbackRate = Math.min(1.25, Math.max(0.7, (parseFloat(rateEl.value) || 0.9) / 0.9));
      var fin = false;
      player = a;
      function finish() { if (fin) return; fin = true; stopReveal(); revealAll(); if (player === a) player = null; done(); }
      function fallback() { if (fin) return; fin = true; stopReveal(); if (player === a) player = null; speakBrowser(text, done); }
      a.onended = finish;
      a.onerror = fallback;
      a.onplay = function () {
        stopReveal();
        revealTimer = setInterval(function () { if (a.duration > 0) revealTo(Math.floor(a.currentTime / a.duration * text.length * 1.03)); }, 80);
      };
      var pr = a.play();
      if (pr && pr.catch) pr.catch(fallback);
    }).catch(function (e) {
      if (mySid !== speakId) return;
      if (!neuralWarned) {
        neuralWarned = true;
        console.warn('Natural voice failed: ' + e.message);
        setState('speaking', 'Natural voice unavailable - using device voice', 'ন্যাচারাল ভয়েস পাওয়া যায়নি - ডিভাইস ভয়েস ব্যবহার হচ্ছে');
      }
      speakBrowser(text, done);
    });
  }
  function speakBrowser(text, done) {
    var rate = parseFloat(rateEl.value) || 0.85, gotB = false, fin = false;
    stopReveal();
    speakText(text, rate,
      function () { fin = true; stopReveal(); revealAll(); done(); },
      function (e) { gotB = true; revealTo(e.charIndex || 0); },
      function () {
        var t0 = Date.now(), total = Math.max(1200, text.length * 190 / rate);
        setTimeout(function () {
          if (gotB || fin || revealTimer) return;
          revealTimer = setInterval(function () { revealTo(Math.floor((Date.now() - t0) / total * text.length)); }, 90);
        }, 700);
      });
  }

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
  function segsFromMarkup(m) {
    var re = /\{([^|{}]+)\|([^{}]+)\}/g, out = [], last = 0, x;
    m = String(m || '');
    while ((x = re.exec(m))) {
      if (x.index > last) out = out.concat(plainSegs(m.slice(last, x.index)));
      out.push({ t: x[1], r: x[2] });
      last = re.lastIndex;
    }
    if (last < m.length) out = out.concat(plainSegs(m.slice(last)));
    return out;
  }
  function renderSegs(el, segs, spans) {
    var pos = 0;
    segs.forEach(function (s) {
      var start = pos; pos += s.t.length;
      if (!isWord(s.t)) {
        if (spans) {
          var p = document.createElement('span'); p.className = 'tl-w'; p.textContent = s.t; p._p = start;
          spans.push(p); el.appendChild(p);
        } else { el.appendChild(document.createTextNode(s.t)); }
        return;
      }
      var w = document.createElement('span');
      w.className = 'tv-word' + (spans ? ' tl-w' : '');
      w.lang = 'ja'; w.tabIndex = 0; w.setAttribute('role', 'button');
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
      if (spans) { w._p = start; spans.push(w); }
      el.appendChild(w);
    });
  }
  function fixEl(fix) {
    var c = document.createElement('div'); c.className = 'tv-fix';
    var s = document.createElement('s'); s.lang = 'ja'; s.textContent = fix.said || '';
    var g = document.createElement('strong'); g.lang = 'ja'; renderSegs(g, plainSegs(fix.better));
    c.appendChild(s); c.appendChild(document.createTextNode('  \u2192  ')); c.appendChild(g);
    if (fix.why) { var w = document.createElement('div'); w.textContent = fix.why; c.appendChild(w); }
    return c;
  }
  function setBot(segs, tr, fix) {
    var bot = $('tl-bot'); bot.innerHTML = ''; botSpans = []; spokenIdx = 0;
    renderSegs(bot, segs, botSpans);
    $('tl-tr').textContent = tr || '';
    var f = $('tl-fix'); f.innerHTML = '';
    if (fix && fix.better) { f.appendChild(fixEl(fix)); f.hidden = false; } else { f.hidden = true; }
    bot.parentNode.scrollTop = 0;
  }

  /* ---------- history tab ---------- */
  function fillBody(body, s) {
    s.turns.forEach(function (t) {
      var d = document.createElement('div'); d.className = 'tv-line ' + (t.r === 'me' ? 'me' : 'bot');
      var a = document.createElement('div'); a.className = 'tv-jp'; a.lang = 'ja';
      renderSegs(a, (t.r === 'bot' && t.m) ? segsFromMarkup(t.m) : plainSegs(t.jp));
      d.appendChild(a);
      if (t.tr) { var b = document.createElement('div'); b.className = 'tv-tr'; b.textContent = t.tr; d.appendChild(b); }
      if (t.fix && t.fix.better) d.appendChild(fixEl(t.fix));
      body.appendChild(d);
    });
  }
  function renderHistory() {
    var box = $('tv-hist'); box.innerHTML = '';
    var all = loadSessions();
    if (!all.length) {
      box.innerHTML = '<p class="tv-empty">' + T('No conversations yet. Start talking in Practice.', 'এখনও কোনো কথোপকথন নেই। অনুশীলন ট্যাবে কথা বলা শুরু করুন।') + '</p>';
      return;
    }
    all.forEach(function (s) {
      var item = document.createElement('div'); item.className = 'tv-hist-item';
      var top = document.createElement('div'); top.className = 'tv-hist-top';
      var open = document.createElement('button'); open.type = 'button'; open.className = 'tv-hist-open'; open.setAttribute('aria-expanded', 'false');
      var l = TOPIC_LABEL[s.topic] || TOPIC_LABEL.free;
      var when = new Date(s.at).toLocaleString(lang() === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      open.innerHTML = '<strong>' + T(l[0], l[1]) + ' \u00b7 ' + String(s.level).replace(/[^N0-9]/g, '') + '</strong><span class="tv-hist-meta">' + when + ' \u00b7 ' + s.turns.length + ' ' + T('messages', 'বার্তা') + '</span>';
      var prev = '';
      for (var i = 0; i < s.turns.length; i++) { if (s.turns[i].r === 'me') { prev = s.turns[i].jp; break; } }
      if (prev) { var p = document.createElement('span'); p.className = 'tv-hist-prev'; p.lang = 'ja'; p.textContent = prev; open.appendChild(p); }
      var del = document.createElement('button'); del.type = 'button'; del.className = 'tv-hist-del'; del.textContent = '\u00d7';
      del.setAttribute('aria-label', 'Delete conversation'); del.setAttribute('data-aria-label-en', 'Delete conversation'); del.setAttribute('data-aria-label-bn', 'কথোপকথন মুছুন');
      var body = document.createElement('div'); body.className = 'tv-hist-body'; body.hidden = true;
      open.addEventListener('click', function () {
        var show = body.hidden;
        body.hidden = !show;
        open.setAttribute('aria-expanded', show ? 'true' : 'false');
        if (show && !body.childNodes.length) fillBody(body, s);
      });
      del.addEventListener('click', function () {
        if (!window.confirm(lang() === 'bn' ? 'এই কথোপকথন মুছবেন?' : 'Delete this conversation?')) return;
        saveSessions(loadSessions().filter(function (x) { return x.id !== s.id; }));
        if (session && session.id === s.id) session = null;
        renderHistory();
      });
      top.appendChild(open); top.appendChild(del);
      item.appendChild(top); item.appendChild(body);
      box.appendChild(item);
    });
  }
  function showTab(name) {
    ['practice', 'history'].forEach(function (n) {
      var on = n === name;
      $('tv-tab-' + n).setAttribute('aria-selected', on ? 'true' : 'false');
      $('tv-panel-' + n).hidden = !on;
    });
    if (name === 'history') renderHistory();
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
    var payload = { text: text, start: !!start, level: levelEl.value, topic: topic, lang: lang(), history: history, interrupted: interrupted };
    interrupted = false;
    var res = await fetch(cfg.url + '/functions/v1/voice-tutor', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tk, 'apikey': cfg.publishableKey || '', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function showError(e) {
    active = false; busy = false; stopRec(); keepAwake(false); flush();
    setState('idle');
    clearOverlay();
    var tr = $('tl-tr');
    if (e.message === 'SIGNIN') tr.innerHTML = T('Please sign in to use the tutor.', 'টিউটর ব্যবহার করতে সাইন ইন করুন।') + ' <a href="auth.html">' + T('Sign in', 'সাইন ইন') + '</a>';
    else tr.textContent = e.message;
  }

  /* ---------- recognition ---------- */
  function norm(s) { return String(s).replace(/[\s\u3000\u3001\u3002\uff1f\uff01?!,.]/g, ''); }
  function isEcho(heard) {
    var h = norm(heard), r = norm(lastReply);
    if (h.length < 2 || !r) return false;
    return r.indexOf(h) >= 0 || (h.length >= 4 && r.indexOf(h.slice(0, 4)) >= 0);
  }
  function stopRec() {
    barging = false;
    if (rec) { rec.onresult = rec.onerror = rec.onend = null; try { rec.abort(); } catch (e) {} rec = null; }
  }
  function markInterrupted() {
    interrupted = true;
    var h = history[history.length - 1];
    if (h && h.role === 'assistant' && spokenIdx > 0 && spokenIdx < h.content.length) h.content = h.content.slice(0, spokenIdx) + '\u2026';
  }
  function cutSpeech() {
    speakId++; stopReveal(); barging = false;
    cancelVoice();markInterrupted(); revealAll();
    if (navigator.vibrate) navigator.vibrate(20);
    setState('listening', 'Your turn \u2014 speak now', 'আপনার পালা \u2014 এখন বলুন');
  }
  function listen(barge) {
    if (!SR) {
      active = false; keepAwake(false);
      setState('idle', 'Voice input is not supported in this browser. Tap the keyboard to type.', 'এই ব্রাউজারে ভয়েস ইনপুট নেই। টাইপ করতে কিবোর্ড চাপুন।');
      return;
    }
    stopRec();
    var got = false, my = epoch;
    lastInterim = '';
    if (!barge) showMe('');
    rec = new SR(); rec.lang = 'ja-JP'; rec.interimResults = true; rec.maxAlternatives = 1;
    barging = !!barge;
    rec.onresult = function (e) {
      if (my !== epoch) return;
      var interim = '', fin = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      var heard = (fin || interim).trim();
      if (stateOf() === 'speaking') {
        if (heard.length < 2 || isEcho(heard)) return;
        cutSpeech();
      }
      lastInterim = interim; showMe(heard);
      if (fin) { got = true; retries = 0; send(fin); }
    };
    rec.onerror = function (e) {
      if (my !== epoch) return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        active = false; keepAwake(false); flush();
        setState('idle', 'Microphone is blocked. Allow it in your browser settings.', 'মাইক ব্লক করা আছে। ব্রাউজার সেটিংসে অনুমতি দিন।');
        return;
      }
      barging = false;
      if (stateOf() === 'speaking') return;
      if (e.error === 'no-speech' && active && retries < 2) {
        retries++; got = true;
        setTimeout(function () { if (my === epoch && active) listen(false); }, 300);
        return;
      }
      active = false; keepAwake(false); flush();
      setState('idle', 'Could not hear you. Tap the mic to try again.', 'শুনতে পাইনি। আবার মাইক চাপুন।');
    };
    rec.onend = function () {
      if (my !== epoch) return;
      var st = stateOf();
      if (st === 'speaking') {
        barging = false;
        if (active && bargeEl.checked) {
          setTimeout(function () { if (my === epoch && active && stateOf() === 'speaking') listen(true); }, 250);
        }
        return;
      }
      if (st !== 'listening') return;
      if (!got && lastInterim) { got = true; send(lastInterim); return; }
      if (!got && active && !busy) {
        active = false; keepAwake(false); flush();
        setState('idle', 'Tap the mic to continue', 'চালিয়ে যেতে মাইক চাপুন');
      }
    };
    if (!barge) {
      if (navigator.vibrate) navigator.vibrate(40);
      setState('listening', 'Your turn \u2014 speak now', 'আপনার পালা \u2014 এখন বলুন');
    }
    try { rec.start(); } catch (e) { active = false; }
  }

  /* ---------- conversation loop ---------- */
  function afterSpeech() {
    if (!active) { setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন'); return; }
    if (barging && rec) {
      showMe(''); lastInterim = '';
      if (navigator.vibrate) navigator.vibrate(40);
      setState('listening', 'Your turn \u2014 speak now', 'আপনার পালা \u2014 এখন বলুন');
    } else { listen(false); }
  }
  async function turn(text, start) {
    var my = epoch;
    busy = true;
    setState('thinking', 'Thinking\u2026', 'ভাবছি\u2026');
    try {
      var r = await ask(text, start);
      if (my !== epoch) return;
      var segs = segsFromMarkup(r.markup || r.reply);
      var plain = segs.map(function (s) { return s.t; }).join('');
      if (!start) { history.push({ role: 'user', content: text }); addTurn({ r: 'me', jp: text }); }
      history.push({ role: 'assistant', content: plain });
      if (history.length > 10) history = history.slice(-10);
      lastReply = plain;
      addTurn({ r: 'bot', jp: plain, m: r.markup || '', tr: r.translation || '', fix: r.correction || null });
      setBot(segs, r.translation, r.correction);
      busy = false;
      setState('speaking', 'Speaking\u2026', 'বলছি\u2026');
      var sid = ++speakId;
      if (active && bargeEl.checked) listen(true);
      speakBot(plain, function () {
        if (my !== epoch || sid !== speakId) return;
        afterSpeech();
      });
    } catch (e) { if (my === epoch) showError(e); }
  }
  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    showMe(text);
    turn(text, false);
  }

  function stopAll() {
    epoch++; speakId++; active = false; busy = false; retries = 0;
    stopRec();
    cancelVoice();
    stopReveal(); revealAll();
    flush(); keepAwake(false);
    setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
  }
  function startSession() {
    openLive();
    active = true; retries = 0; keepAwake(true);
    if (history.length === 0) turn('', true); else listen(false);
  }
  function endSession() { stopAll(); closeLive(); }
  function interrupt() {
    speakId++; stopReveal();
    cancelVoice();
    markInterrupted(); revealAll();
    active = true; keepAwake(true); retries = 0;
    listen(false);
  }
  function micToggle() {
    var s = stateOf();
    if (s === 'thinking') return;
    if (s === 'speaking') { interrupt(); return; }
    if (s === 'listening') {
      stopRec(); active = false; flush();
      setState('idle', 'Paused. Tap the mic to talk.', 'বিরতি। কথা বলতে মাইক চাপুন।');
      return;
    }
    startSession();
  }
  function repeatBot() {
    if (!lastReply) return;
    stopAll();
    botSpans.forEach(function (s) { s.classList.remove('on'); });
    setState('speaking', 'Speaking\u2026', 'বলছি\u2026');
    var sid = ++speakId;
    speakBot(lastReply, function () {
      if (sid === speakId) setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
    });
  }
  function sendFrom(el) {
    if (busy) return;
    var t = el.value;
    if (!t.trim()) return;
    el.value = '';
    speakId++; stopReveal(); stopRec();
    cancelVoice();
    revealAll();
    send(t);
  }
  function resetConversation() {
    stopAll(); history = []; lastReply = ''; session = null; interrupted = false; clearOverlay();
  }

  /* ---------- controls ---------- */
  orb.addEventListener('click', function () {
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

  $('tv-tab-practice').addEventListener('click', function () { showTab('practice'); });
  $('tv-tab-history').addEventListener('click', function () { showTab('history'); });
  $('tv-hist-clear').addEventListener('click', function () {
    if (!window.confirm(lang() === 'bn' ? 'সব কথোপকথন মুছবেন?' : 'Delete all conversations?')) return;
    saveSessions([]); session = null; renderHistory();
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
      resetConversation();
      startSession();
    });
  }
  markTopic();
  renderStats();
  showTab('practice');
  setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
})();
