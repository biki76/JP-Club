import fs from 'fs';
var p = 'js/tutor-voice.js', s = fs.readFileSync(p, 'utf8');
if (s.indexOf('function echoWindow') >= 0) { console.log('already patched'); process.exit(0); }

var D1 = "var lastInterim = '', spokenIdx = 0, interrupted = false, session = null;";
var D2 = "bargeEl.checked = localStorage.getItem('nihongo_tutor_barge') !== 'off';";
var D3 = "var got = false, my = epoch;";
var D4 = "if (!got && lastInterim) { got = true; send(lastInterim); return; }";
var D5 = "if (stateOf() === 'speaking') {";
var D6 = "function isEcho(heard) {";
var D7 = "function stopRec() {";
var D8 = "function afterSpeech() {";
var D9 = "async function turn(text, start) {";
[D1, D2, D3, D4, D5, D6, D7, D8, D9].forEach(function (a) {
  if (s.indexOf(a) < 0) { console.log('anchor not found: ' + a.slice(0, 70)); process.exit(1); }
});

var ECHO = [
"function isEcho(heard) {",
"    var h = norm(heard), r = norm(lastReply);",
"    if (h.length < 2 || !r) return false;",
"    if (r.indexOf(h) >= 0 || h.indexOf(r) >= 0) return true;",
"    var hit = 0, n = 0, i;",
"    for (i = 0; i + 1 < h.length; i++) { n++; if (r.indexOf(h.slice(i, i + 2)) >= 0) hit++; }",
"    return n > 0 && hit / n >= 0.7;",
"  }",
"  function echoWindow() { return stateOf() === 'speaking' || (Date.now() - speechEndedAt) < 2500; }",
"  "
].join('\n');

var AFTER = [
"function afterSpeech() {",
"    speechEndedAt = Date.now();",
"    if (!active) { setState('idle', 'Tap the mic to talk', 'কথা বলতে মাইক চাপুন'); return; }",
"    stopRec();",
"    var my = epoch, sid = speakId;",
"    setTimeout(function () {",
"      if (my === epoch && sid === speakId && active && !busy) listen(false);",
"    }, 600);",
"  }",
"  "
].join('\n');

var END = [
"if (!got && lastInterim && lastInterim.trim().length >= 3 && !(echoWindow() && isEcho(lastInterim))) { got = true; send(lastInterim); return; }",
"      if (!got && ignored && active && retries < 4) {",
"        retries++;",
"        setTimeout(function () { if (my === epoch && active && stateOf() === 'listening') listen(false); }, 400);",
"        return;",
"      }"
].join('\n');

s = s.replace(D1, function () { return "var lastInterim = '', spokenIdx = 0, interrupted = false, session = null, speechEndedAt = 0;"; });
s = s.replace(D2, function () { return "bargeEl.checked = localStorage.getItem('nihongo_tutor_barge') === 'on';"; });
s = s.replace(D3, function () { return "var got = false, ignored = false, my = epoch;"; });
s = s.replace(D4, function () { return END; });
s = s.replace(D5, function () {
  return "if (stateOf() !== 'speaking' && (heard.length < 2 || (echoWindow() && isEcho(heard)))) { ignored = true; return; }\n      if (stateOf() === 'speaking') {";
});
var a = s.indexOf(D6), b = s.indexOf(D7);
if (a < 0 || b <= a) { console.log('isEcho block not found'); process.exit(1); }
s = s.slice(0, a) + ECHO + s.slice(b);
var c = s.indexOf(D8), d = s.indexOf(D9);
if (c < 0 || d <= c) { console.log('afterSpeech block not found'); process.exit(1); }
s = s.slice(0, c) + AFTER + s.slice(d);

fs.writeFileSync(p, s);
console.log('echo fix applied');
