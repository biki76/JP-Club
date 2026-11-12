#!/usr/bin/env node
/* tools/fix-voice-menu.mjs — shorter voice menu labels, removes a duplicated "Free AI" group,
 * and shows a visible notice when the free voice falls back to the device voice.
 *   node tools/fix-voice-menu.mjs --dry
 *   node tools/fix-voice-menu.mjs            (idempotent)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const log = [];

function fix(s) {
  const notes = [];
  let lines = s.split('\n');

  // 1. remove a duplicated Free AI group (keep the first copy)
  const starts = lines.map((l, i) => (l.includes("var gP = document.createElement('optgroup')") ? i : -1)).filter((i) => i >= 0);
  if (starts.length > 1) {
    const from = starts[1];
    const end = lines.findIndex((l, i) => i > from && l.includes('if (gP.childNodes.length) voiceEl.appendChild(gP);'));
    if (end > from) { lines.splice(from, end - from + 1); notes.push('removed duplicate Free AI group'); }
  }

  // 2. short labels
  let n = 0;
  lines = lines.map((l) => {
    const t = l.trim(), ind = l.match(/^\s*/)[0];
    if (t.startsWith("g2.label = 'This device")) { n++; return ind + "g2.label = 'Device';"; }
    if (l.includes("gP.label = 'Free AI voice (downloads once)'")) { n++; return l.replace("gP.label = 'Free AI voice (downloads once)'", "gP.label = 'Free AI'"); }
    return l;
  });
  if (n) notes.push('shortened group labels');
  s = lines.join('\n');

  // 3. notice helper + visible fallback (only inside speakPiper)
  if (!s.includes('function showVoiceNotice(')) {
    const anchor = '  /* Free in-browser Piper voice.';
    if (s.split(anchor).length - 1 !== 1) throw new Error('speakPiper comment anchor not found');
    s = s.replace(anchor,
`  /* Visible, auto-hiding notice so a silent fallback to the device voice is never mistaken for the free voice. */
  function showVoiceNotice(msg) {
    var n = document.getElementById('tutor-voice-notice');
    if (!n) {
      n = document.createElement('div');
      n.id = 'tutor-voice-notice';
      n.setAttribute('role', 'status');
      n.style.cssText = 'position:fixed;left:12px;right:12px;bottom:96px;z-index:9999;padding:10px 12px;border-radius:10px;background:#1f2937;color:#fff;font-size:14px;line-height:1.4;';
      document.body.appendChild(n);
    }
    n.textContent = msg;
    clearTimeout(n._t);
    n._t = setTimeout(function () { n.textContent = ''; }, 7000);
  }
` + anchor);
    notes.push('added notice helper');
  }
  const c1 = "      console.warn('Piper voice unavailable, using device voice: ' + (e && e.message));";
  if (s.includes(c1) && !s.includes("showVoiceNotice('Free voice unavailable")) {
    s = s.replace(c1, c1 + "\n      showVoiceNotice('Free voice unavailable (' + ((e && e.message) || 'unknown') + '). Using device voice.');");
    notes.push('notice on load failure');
  }
  // fallback inside speakPiper only (speakBot has an identical line later in the file)
  const at = s.indexOf('function speakPiper(');
  if (at >= 0) {
    const oldFb = 'if (player === a) player = null; speakBrowser(text, done); }';
    const rel = s.slice(at).indexOf(oldFb);
    if (rel >= 0 && !s.slice(at, at + rel + 200).includes('Free voice could not play')) {
      const pos = at + rel;
      s = s.slice(0, pos) + "if (player === a) player = null; showVoiceNotice('Free voice could not play. Using device voice.'); speakBrowser(text, done); }" + s.slice(pos + oldFb.length);
      notes.push('notice on playback fallback');
    }
  }
  return { text: s, notes };
}

async function run(rel, name, fn) {
  const file = join(ROOT, rel);
  const before = await readFile(file, 'utf8');
  const { text, notes } = fn(before);
  if (text === before) return log.push(`ok    ${rel} — ${name} (already applied)`);
  if (!DRY) await writeFile(file, text, 'utf8');
  log.push(`EDIT  ${rel} — ${name}: ${notes.join('; ')}`);
}

await run('js/tutor-voice.js', 'menu + notices', fix);
await run('js/tutor-piper.js', 'short Piper label', (s) => ({
  text: s.replace(/label: 'Tsukuyomi[^']*'/, "label: 'Tsukuyomi (Piper, free)'"), notes: ['label'],
}));

console.log(log.join('\n'));
console.log(`\n${DRY ? '(dry run) ' : ''}done`);
