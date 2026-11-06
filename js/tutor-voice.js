(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var $ = function (id) { return document.getElementById(id); };
  var orb = $('tv-orb'), statusEl = $('tv-status'), log = $('tv-log');
  var levelEl = $('tv-level'), rateEl = $('tv-rate'), input = $('tv-input');
  var history = [], rec = null, active = false, busy = false, lastReply = '';

  function lang() { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
  function T(en, bn) {
    return '<span data-en="' + en + '" data-bn="' + bn + '">' + (lang() === 'bn' ? bn : en) + '</span>';
  }
  function setState(s, en, bn) {
    orb.setAttribute('data-state', s);
    statusEl.innerHTML = en ? T(en, bn) : '';
  }

  levelEl.value = localStorage.getItem('nihongo_tutor_level') || 'N5';
  rateEl.value = localStorage.getItem('nihongo_tutor_rate') || '0.85';
  levelEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_level', levelEl.value); });
  rateEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_rate', rateEl.value); });

  function addLine(cls, jp, tr, fix) {
    var d = document.createElement('div');
    d.className = 'tv-line ' + cls;
    var a = document.createElement('div'); a.className = 'tv-jp'; a.lang = 'ja'; a.textContent = jp; d.appendChild(a);
    if (tr) { var b = document.createElement('div'); b.className = 'tv-tr'; b.textContent = tr; d.appendChild(b); }
    if (fix && fix.better) {
      var c = document.createElement('div'); c.className = 'tv-fix';
      var s = document.createElement('s'); s.lang = 'ja'; s.textContent = fix.said || '';
      var g = document.createElement('strong'); g.lang = 'ja'; g.textContent = fix.better;
      c.appendChild(s); c.appendChild(document.createTextNode('  \u2192  ')); c.appendChild(g);
      if (fix.why) { var w = document.createElement('div'); w.textContent = fix.why; c.appendChild(w); }
      d.appendChild(c);
    }
    log.appendChild(d);
    d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

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
      body: JSON.stringify({ text: text, start: !!start, level: levelEl.value, lang: lang(), history: history })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function speak(text, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = parseFloat(rateEl.value) || 0.85;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^ja/i.test(x.lang); })[0];
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  }

  function showError(e) {
    active = false; busy = false;
    setState('idle');
    var d = document.createElement('div');
    d.className = 'tv-line bot tv-err';
    if (e.message === 'SIGNIN') d.innerHTML = T('Please sign in to use the tutor.', 'টিউটর ব্যবহার করতে সাইন ইন করুন।') + ' <a href="auth.html">' + T('Sign in', 'সাইন ইন') + '</a>';
    else d.textContent = e.message;
    log.appendChild(d);
  }

  async function turn(text, start) {
    busy = true;
    setState('thinking', 'Thinking\u2026', 'ভাবছি\u2026');
    try {
      var r = await ask(text, start);
      if (!start) history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: r.reply });
      lastReply = r.reply;
      addLine('bot', r.reply, r.translation, r.correction);
      busy = false;
      setState('speaking', 'Speaking\u2026', 'বলছি\u2026');
      speak(r.reply, function () { if (active) listen(); else setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন'); });
    } catch (e) { showError(e); }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    addLine('me', text);
    turn(text, false);
  }

  function listen() {
    if (!SR) { setState('idle', 'Voice input is not supported in this browser. Type below.', 'এই ব্রাউজারে ভয়েস ইনপুট নেই। নিচে টাইপ করুন।'); active = false; return; }
    var got = false;
    rec = new SR(); rec.lang = 'ja-JP'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) { got = true; send(e.results[0][0].transcript); };
    rec.onerror = function () { active = false; setState('idle', 'Could not hear you. Tap the mic to try again.', 'শুনতে পাইনি। আবার মাইক চাপুন।'); };
    rec.onend = function () { if (!got && active && !busy) { active = false; setState('idle', 'Tap the mic to continue', 'চালিয়ে যেতে মাইক চাপুন'); } };
    setState('listening', 'Listening\u2026 speak Japanese', 'শুনছি\u2026 জাপানিতে বলুন');
    try { rec.start(); } catch (e) { active = false; }
  }

  function stopAll() {
    active = false;
    try { if (rec) rec.abort(); } catch (e) {}
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
  }

  orb.addEventListener('click', function () {
    if (busy) return;
    if (active) { stopAll(); return; }
    active = true;
    if (history.length === 0) turn('', true); else listen();
  });
  $('tv-send').addEventListener('click', function () { var t = input.value; input.value = ''; send(t); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var t = input.value; input.value = ''; send(t); } });
  $('tv-repeat').addEventListener('click', function () { if (lastReply) { active = false; speak(lastReply, function () {}); } });
  $('tv-reset').addEventListener('click', function () { stopAll(); history = []; lastReply = ''; log.innerHTML = ''; });

  setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন');
})();
