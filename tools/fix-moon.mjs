#!/usr/bin/env node
/* tools/fix-moon.mjs — fixes Moon's first greeting, makes her replies more natural,
 * and makes the voice panel honest about which device voice "Auto" uses.
 *
 *   node tools/fix-moon.mjs --dry     preview
 *   node tools/fix-moon.mjs           apply (idempotent)
 *
 * Touches:
 *  - supabase/functions/voice-tutor/index.ts  (fixed greeting, prompt tone)
 *  - js/tutor-voice.js                        (voice panel labels, no duplicate entries)
 * Every anchor is checked; a missing anchor stops that edit and is reported.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const log = [];

async function patch(rel, edits) {
  const file = join(ROOT, rel);
  let s = await readFile(file, 'utf8');
  const before = s;
  for (const { name, from, to, guard } of edits) {
    if (guard && s.includes(guard)) { log.push(`ok    ${rel} — ${name} (already applied)`); continue; }
    const n = s.split(from).length - 1;
    if (n !== 1) { log.push(`SKIP  ${rel} — ${name}: anchor found ${n} time(s), expected 1`); continue; }
    s = s.replace(from, to);
    log.push(`EDIT  ${rel} — ${name}`);
  }
  if (s !== before && !DRY) await writeFile(file, s, 'utf8');
}

/* ───────── voice-tutor: fixed greeting + more natural persona ───────── */
const GREET_JP = 'こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。';
const GREET_EN = 'Hello, I am Moon. Nice to meet you. What is your name?';
const GREET_BN = 'নমস্কার, আমি মুন। আপনার সাথে পরিচিত হয়ে ভালো লাগছে। আপনার নাম কী?';

await patch('supabase/functions/voice-tutor/index.ts', [
  {
    name: 'fixed greeting (no model call for the first line)',
    guard: 'FIXED_GREETING',
    from: '    const level = LEVELS[body.level] ? body.level : "N5";',
    to:
`    // FIXED_GREETING: the very first line is a checked sentence, not model output.
    // The model used to read ムーン wrongly and say きょう… at the start.
    if (body.start === true) {
      const greet = ${JSON.stringify(GREET_JP)};
      const tr = body.lang === "en" ? ${JSON.stringify(GREET_EN)} : ${JSON.stringify(GREET_BN)};
      return json({ build: BUILD, markup: greet, reply: greet, translation: tr, correction: null });
    }
    const level = LEVELS[body.level] ? body.level : "N5";`,
  },
  {
    name: 'persona: mature, articulate, natural',
    guard: 'mature, articulate',
    from: 'You are Moon (ムーン), a warm, easygoing native Japanese speaker having a casual voice chat with a learner at level " + level + ". " +',
    to: 'You are Moon (ムーン), a mature, articulate and warm native Japanese speaker having a natural voice conversation with a learner at level " + level + ". Speak like an educated adult in Tokyo: calm, clear, never childish. " +',
  },
  {
    name: 'name rule + self-introduction rule',
    guard: 'Your name is ムーン (Moon)',
    from: '"How to talk:\\n" +',
    to: '"How to talk:\\n" +\n      "- Your name is ムーン (Moon). Always read it as ムーン. Never read it as きょう or any other word. When you introduce yourself, say ムーンです.\\n" +',
  },
  {
    name: 'fewer, more natural backchannels',
    guard: 'only when it fits naturally',
    from: '- Use aizuchi like a real Japanese listener: begin most replies with a short backchannel such as はい、 / そうですか。 / へえー。 / なるほど。 / いいですね。 and vary it.\\n" +',
    to: '- Use a short backchannel (そうですか。/ なるほど。/ いいですね。) only when it fits naturally, not in every reply.\\n" +',
  },
]);

/* ───────── voice panel: honest labels, no duplicate rows ───────── */
await patch('js/tutor-voice.js', [
  {
    name: 'device voice list: show what Auto picks, de-duplicate names',
    guard: 'autoVoiceName',
    from: "    g2.appendChild(opt('b:', 'Device voice (auto)'));\n    jaVoices().forEach(function (v) { g2.appendChild(opt('b:' + v.voiceURI, v.name)); });",
    to:
`    var seenName = {}, uniq = jaVoices().filter(function (v) { if (seenName[v.name]) return false; seenName[v.name] = 1; return true; });
    var autoName = (function () {
      var l = jaVoices(), best = null, score = -1;   // autoVoiceName: same rule as pickVoice()
      l.forEach(function (v) { var s = /natural|neural|online|premium|enhanced/i.test(v.name) ? 3 : (/google/i.test(v.name) ? 2 : 1); if (s > score) { score = s; best = v; } });
      return best ? best.name : '';
    })();
    g2.label = 'This device \\u2014 ' + uniq.length + ' Japanese voice' + (uniq.length === 1 ? '' : 's') + ' installed';
    g2.appendChild(opt('b:', autoName ? 'Auto \\u2014 ' + autoName : 'Auto (no Japanese voice on this device)'));
    uniq.forEach(function (v) { g2.appendChild(opt('b:' + v.voiceURI, v.name)); });`,
  },
]);

console.log(log.join('\n'));
const skipped = log.filter((l) => l.startsWith('SKIP')).length;
console.log(`\n${DRY ? '(dry run) ' : ''}${skipped ? skipped + ' edit(s) skipped — see above' : 'all edits applied or already present'}`);
console.log('Next: redeploy voice-tutor (copy index.ts from the repo Raw view), then push js/tutor-voice.js.');
