import fs from 'node:fs';
import path from 'node:path';

const SRC = process.env.AUDIO_SOURCE_DIR;
const BUCKET = 'nihongo-audio';
const DRY = process.env.DRY === '1';
if (!SRC || !fs.existsSync(SRC)) { console.error('Set AUDIO_SOURCE_DIR to the MP3 folder'); process.exit(1); }

const cfg = fs.readFileSync('js/supabase-config.js', 'utf8');
const BASE = process.env.SUPABASE_URL || (cfg.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
const KEY = process.env.SUPABASE_KEY || (cfg.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+/) || [])[0];
if (!BASE || !KEY) { console.error('Could not read Supabase URL/key from js/supabase-config.js'); process.exit(1); }

const INTRO = ['Pronunciation 1: Kana & Mora', 'Pronunciation 2: Long Vowels', 'Pronunciation 3: The n Sound',
  'Pronunciation 4: Double Consonants', 'Pronunciation 5: Contracted Sounds', 'Pronunciation 6: Pitch Accent',
  'Pronunciation 7: Intonation', 'Classroom Commands', 'Everyday Greetings', 'Numbers'];
const KINDS = [['sentence-patterns', 'Sentence Patterns & Examples'], ['exercise-c', 'Exercise C'], ['conversation', 'Conversation (Kaiwa)']];
const pad = (n, w) => String(n).padStart(w, '0');

function info(n) {
  if (n <= 10) return { slug: 'minna-001', type: 'intro', en: 'Intro: ' + INTRO[n - 1] };
  if (n >= 86) return { slug: n === 86 ? 'minna-012' : 'minna-025', type: 'review', en: 'General Review ' + (n - 85) };
  const i = n - 11, L = Math.floor(i / 3) + 1, k = KINDS[i % 3];
  return { slug: 'minna-' + pad(L, 3), type: k[0], en: 'Lesson ' + L + ': ' + k[1] };
}

function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.mp3$/i.test(f.name)) out.push(p);
  }
  return out;
}

const files = {};
for (const p of walk(SRC, [])) {
  const m = path.basename(p, path.extname(p)).match(/(\d{1,3})(?!.*\d)/);
  const n = m ? parseInt(m[0], 10) : 0;
  if (n < 1 || n > 87) { console.warn('skip (no track 1-87):', p); continue; }
  if (files[n]) { console.warn('duplicate track ' + n + ', keeping first:', p); continue; }
  files[n] = p;
}
const nums = Object.keys(files).map(Number).sort((a, b) => a - b);
console.log('Found ' + nums.length + ' of 87 tracks');
const missing = [];
for (let n = 1; n <= 87; n++) if (!files[n]) missing.push(n);
if (missing.length) console.warn('Missing tracks:', missing.join(', '));

const bySlug = {};
let ok = 0, fail = 0;
for (const n of nums) {
  const meta = info(n);
  const objPath = meta.slug + '/track-' + pad(n, 2) + '.mp3';
  const url = BASE + '/storage/v1/object/public/' + BUCKET + '/' + objPath;
  if (!DRY) {
    const res = await fetch(BASE + '/storage/v1/object/' + BUCKET + '/' + objPath, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
      body: fs.readFileSync(files[n])
    });
    if (!res.ok) { fail++; console.error('FAIL track ' + n + ': ' + res.status + ' ' + (await res.text())); continue; }
  }
  ok++;
  console.log((DRY ? 'dry ' : 'up   ') + pad(n, 2) + ' -> ' + objPath);
  (bySlug[meta.slug] = bySlug[meta.slug] || []).push({
    id: 'honsatsu-' + pad(n, 2), type: meta.type,
    title: { en: meta.en, bn: meta.en }, audioUrl: url
  });
}

for (const slug of Object.keys(bySlug)) {
  const dir = path.join('data', 'lessons', slug);
  fs.mkdirSync(dir, { recursive: true });
  const doc = { lessonSlug: slug, tracks: bySlug[slug] };
  if (!DRY) fs.writeFileSync(path.join(dir, 'honsatsu-audio.json'), JSON.stringify(doc, null, 2) + '\n');
  const mf = path.join(dir, 'manifest.json');
  if (fs.existsSync(mf)) {
    const man = JSON.parse(fs.readFileSync(mf, 'utf8'));
    man.dataFiles = man.dataFiles || {};
    man.dataFiles.honsatsuAudio = 'honsatsu-audio.json';
    if (!DRY) fs.writeFileSync(mf, JSON.stringify(man, null, 2) + '\n');
  } else {
    console.warn('no manifest for ' + slug + ' (JSON written, manifest not updated)');
  }
}
console.log('Done. uploaded=' + ok + ' failed=' + fail);
