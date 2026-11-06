import fs from 'fs';
var p = 'js/tutor-voice.js';
var s = fs.readFileSync(p, 'utf8');
if (s.indexOf('function cancelVoice') >= 0) { console.log('already patched'); process.exit(0); }

var A1 = "function fillVoices() {";
var A2 = "  if ('speechSynthesis' in window) { fillVoices(); speechSynthesis.addEventListener('voiceschanged', fillVoices); }";
var A3 = "var list = jaVoices(), sel = voiceEl.value, i;";
var A4 = "function speakBot(text, done) {";
var A5 = "voiceEl.addEventListener('change', function () { localStorage.setItem('nihongo_tutor_voice', voiceEl.value); });";
var A6 = "if ('speechSynthesis' in window) speechSynthesis.cancel();";
[A1, A2, A3, A4, A5, A6].forEach(function (a) {
  if (s.indexOf(a) < 0) { console.log('anchor not found: ' + a.slice(0, 70)); process.exit(1); }
});

var FILL = [
"function fillVoices() {",
"    var keep = localStorage.getItem('nihongo_tutor_voice') || 'n:female';",
"    voiceEl.innerHTML = '';",
"    var g1 = document.createElement('optgroup'); g1.label = 'Natural (recommended)';",
"    [['n:female', 'Female - Aoede'], ['n:female2', 'Female - Sulafat'], ['n:male', 'Male - Charon'], ['n:male2', 'Male - Achird']].forEach(function (x) {",
"      var o = document.createElement('option'); o.value = x[0]; o.textContent = x[1]; g1.appendChild(o);",
"    });",
"    voiceEl.appendChild(g1);",
"    var g2 = document.createElement('optgroup'); g2.label = 'This device';",
"    var auto = document.createElement('option'); auto.value = 'b:'; auto.textContent = 'Device voice (auto)'; g2.appendChild(auto);",
"    jaVoices().forEach(function (v) { var o = document.createElement('option'); o.value = 'b:' + v.voiceURI; o.textContent = v.name; g2.appendChild(o); });",
"    voiceEl.appendChild(g2);",
"    voiceEl.value = keep;",
"    if (voiceEl.value !== keep) voiceEl.value = 'n:female';",
"  }",
"  fillVoices();",
"  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices);"
].join('\n');

var CHANGE = [
"voiceEl.addEventListener('change', function () {",
"    localStorage.setItem('nihongo_tutor_voice', voiceEl.value);",
"    speakId++; cancelVoice(); botSpans = [];",
"    speakBot('こんにちは。よろしくお願いします。', function () {});",
"  });"
].join('\n');

var NEW = [
"var player = null, neuralWarned = false;",
"  function neuralKey() { var v = voiceEl.value; return v.indexOf('n:') === 0 ? v.slice(2) : ''; }",
"  function cancelVoice() {",
"    if (player) { player.onended = null; player.onerror = null; try { player.pause(); } catch (e) {} player = null; }",
"    if ('speechSynthesis' in window) speechSynthesis.cancel();",
"  }",
"  async function fetchSpeech(text) {",
"    var cfg = window.SUPABASE_CONFIG || {};",
"    var tk = await token();",
"    var res = await fetch(cfg.url + '/functions/v1/voice-speak', {",
"      method: 'POST',",
"      headers: { 'Authorization': 'Bearer ' + tk, 'apikey': cfg.publishableKey || '', 'Content-Type': 'application/json' },",
"      body: JSON.stringify({ text: text, voice: neuralKey(), rate: parseFloat(rateEl.value) || 0.9 })",
"    });",
"    var data = await res.json().catch(function () { return {}; });",
"    if (!res.ok || !data.audio) throw new Error(data.error || ('HTTP ' + res.status));",
"    return data.audio;",
"  }",
"  function speakBot(text, done) {",
"    if (!neuralKey()) { speakBrowser(text, done); return; }",
"    var mySid = speakId;",
"    stopReveal();",
"    fetchSpeech(text).then(function (b64) {",
"      if (mySid !== speakId) return;",
"      var a = new Audio('data:audio/mp3;base64,' + b64);",
"      var fin = false;",
"      player = a;",
"      function finish() { if (fin) return; fin = true; stopReveal(); revealAll(); if (player === a) player = null; done(); }",
"      function fallback() { if (fin) return; fin = true; stopReveal(); if (player === a) player = null; speakBrowser(text, done); }",
"      a.onended = finish;",
"      a.onerror = fallback;",
"      a.onplay = function () {",
"        stopReveal();",
"        revealTimer = setInterval(function () { if (a.duration > 0) revealTo(Math.floor(a.currentTime / a.duration * text.length * 1.03)); }, 80);",
"      };",
"      var pr = a.play();",
"      if (pr && pr.catch) pr.catch(fallback);",
"    }).catch(function (e) {",
"      if (mySid !== speakId) return;",
"      if (!neuralWarned) {",
"        neuralWarned = true;",
"        console.warn('Natural voice failed: ' + e.message);",
"        setState('speaking', 'Natural voice unavailable - using device voice', 'ন্যাচারাল ভয়েস পাওয়া যায়নি - ডিভাইস ভয়েস ব্যবহার হচ্ছে');",
"      }",
"      speakBrowser(text, done);",
"    });",
"  }"
].join('\n');

// order matters: swap the cancel calls first, then add the new code
s = s.split(A6).join('cancelVoice();');
var i1 = s.indexOf(A1), i2 = s.indexOf(A2) + A2.length;
if (i1 < 0 || i2 <= i1) { console.log('voice block not found'); process.exit(1); }
s = s.slice(0, i1) + FILL + s.slice(i2);
s = s.replace(A3, function () { return "var list = jaVoices(), sel = voiceEl.value.indexOf('b:') === 0 ? voiceEl.value.slice(2) : '', i;"; });
s = s.replace(A5, function () { return CHANGE; });
s = s.replace(A4, function () { return NEW + '\n  function speakBrowser(text, done) {'; });
fs.writeFileSync(p, s);
console.log('js patched');
