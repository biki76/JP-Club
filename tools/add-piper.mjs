#!/usr/bin/env node
/* tools/add-piper.mjs — wires the free in-browser Piper voice into the tutor page. Idempotent.
 *
 *   npm view piper-plus version              ← run in Termux, copy the number
 *   npm view onnxruntime-web version         ← run in Termux, copy the number
 *   node tools/add-piper.mjs --piper=<version> --ort=<version> --dry
 *   node tools/add-piper.mjs --piper=<version> --ort=<version>
 *
 * Edits:
 *  - tutor.html: importmap (pinned versions), CSP (wasm-unsafe-eval, HuggingFace downloads,
 *    worker blobs), loads js/tutor-piper.js, bumps tutor-voice.js cache version
 *  - js/tutor-voice.js: "Free AI voice" menu entry and speakPiper() with device-voice fallback
 * Every anchor must match exactly once; otherwise that edit is skipped and reported.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const DRY = args.has('dry');
const PIPER = args.get('piper'), ORT = args.get('ort');
if (!PIPER || !ORT || PIPER === true || ORT === true) {
  console.error('usage: node tools/add-piper.mjs --piper=<version> --ort=<version> [--dry]');
  console.error('get versions: npm view piper-plus version ; npm view onnxruntime-web version');
  process.exit(2);
}
if (!/^\d+\.\d+\.\d+/.test(PIPER) || !/^\d+\.\d+\.\d+/.test(ORT)) { console.error('versions must look like 1.2.3'); process.exit(2); }

const log = [];
async function edit(rel, name, fn) {
  const file = join(ROOT, rel);
  const before = await readFile(file, 'utf8');
  const res = fn(before);
  if (res.error) { log.push(`SKIP  ${rel} — ${name}: ${res.error}`); return; }
  if (res.text === before) { log.push(`ok    ${rel} — ${name} (already applied)`); return; }
  if (!DRY) await writeFile(file, res.text, 'utf8');
  log.push(`EDIT  ${rel} — ${name}`);
}
const once = (s, from) => s.split(from).length - 1;
function replaceOnce(s, from, to, name) {
  const n = once(s, from);
  if (n !== 1) return { error: `anchor found ${n} time(s) for "${name}"` };
  return { text: s.replace(from, to) };
}

const PIPER_ENGINE_SCRIPT = '  <script src="js/tutor-piper.js" defer></script>';
const IMPORTMAP = `  <script type="importmap">{"imports":{"onnxruntime-web":"https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT}/dist/ort.min.mjs","piper-plus":"https://cdn.jsdelivr.net/npm/piper-plus@${PIPER}/src/index.js"}}</script>`;

/* ── tutor.html ── */
await edit('tutor.html', 'importmap + engine script + cache bump + CSP', (s) => {
  let t = s;
  if (!t.includes('type="importmap"')) {
    const r = replaceOnce(t, '  <script src="js/tutor-data.js?v=6" defer></script>', IMPORTMAP + '\n' + '  <script src="js/tutor-data.js?v=6" defer></script>', 'tutor-data script');
    if (r.error) return r;
    t = r.text;
  }
  if (!t.includes('js/tutor-piper.js')) {
    const r = replaceOnce(t, '  <script src="js/tutor-voice.js?v=6" defer></script>', PIPER_ENGINE_SCRIPT + '\n  <script src="js/tutor-voice.js?v=7" defer></script>', 'tutor-voice script');
    if (r.error) return r;
    t = r.text;
  }
  if (!t.includes("'wasm-unsafe-eval'")) {
    const r = replaceOnce(t, "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;", "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;", 'script-src');
    if (r.error) return r;
    t = r.text;
  }
  if (!t.includes('huggingface.co')) {
    const r = replaceOnce(t, "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net;", "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co; worker-src 'self' blob:;", 'connect-src');
    if (r.error) return r;
    t = r.text;
  }
  return { text: t };
});

/* ── tutor-voice.js ── */
await edit('js/tutor-voice.js', 'free AI voice menu entry', (s) => {
  if (s.includes("'p:tsukuyomi'")) return { text: s };
  return replaceOnce(s,
    "    var g2 = document.createElement('optgroup'); g2.label = 'This device';",
    "    var gP = document.createElement('optgroup'); gP.label = 'Free AI voice (downloads once)';\n" +
    "    (window.TutorPiper ? window.TutorPiper.voices : []).forEach(function (v) { gP.appendChild(opt('p:' + v.id, v.label)); });\n" +
    "    if (gP.childNodes.length) voiceEl.appendChild(gP);\n" +
    "    var g2 = document.createElement('optgroup'); g2.label = 'This device';", 'device group');
});
await edit('js/tutor-voice.js', 'speakPiper() with device-voice fallback', (s) => {
  if (s.includes('function speakPiper(')) return { text: s };
  return replaceOnce(s, '  function speakBot(text, done) {',
`  /* Free in-browser Piper voice. Any failure falls back to the device voice. */
  function speakPiper(text, done) {
    onSpeechStart();
    var mySid = speakId;
    stopReveal();
    window.TutorPiper.speak(text, parseFloat(rateEl.value) || 0.9).then(function (a) {
      if (mySid !== speakId) return;
      var fin = false;
      player = a;
      function finish() { if (fin) return; fin = true; stopReveal(); revealAll(); if (player === a) player = null; done(); }
      function fallback() { if (fin) return; fin = true; stopReveal(); if (player === a) player = null; speakBrowser(text, done); }
      a.onended = finish;
      a.onerror = fallback;
      a.onplay = function () {
        onSpeechStart();
        stopReveal();
        revealTimer = setInterval(function () {
          if (a.duration > 0) revealTo(Math.floor(a.currentTime / a.duration * text.length * 1.03));
        }, 80);
      };
      var pr = a.play();
      if (pr && pr.catch) pr.catch(fallback);
    }).catch(function (e) {
      if (mySid !== speakId) return;
      console.warn('Piper voice unavailable, using device voice: ' + (e && e.message));
      speakBrowser(text, done);
    });
  }
  function speakBot(text, done) {`, 'speakBot');
});
await edit('js/tutor-voice.js', 'route p: voices to speakPiper()', (s) => {
  if (s.includes("voiceEl.value.indexOf('p:') === 0")) return { text: s };
  return replaceOnce(s, "    if (!neuralKey()) { speakBrowser(text, done); return; }",
    "    if (voiceEl.value.indexOf('p:') === 0) { speakPiper(text, done); return; }\n    if (!neuralKey()) { speakBrowser(text, done); return; }", 'neuralKey route');
});

console.log(log.join('\n'));
const skipped = log.filter((l) => l.startsWith('SKIP')).length;
console.log(`\n${DRY ? '(dry run) ' : ''}${skipped ? skipped + ' edit(s) skipped — see above' : 'done'}`);
if (!skipped && !DRY) console.log('Next: commit and push, then hard-refresh tutor.html. The first Piper voice use downloads the model.');
