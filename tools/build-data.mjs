#!/usr/bin/env node
/* tools/build-data.mjs — validate + split the large monolithic datasets into lazy-loadable chunks.
 * Zero dependencies, synchronous-ish and small-memory: fine for Termux (Node 18+).
 *
 *   node tools/build-data.mjs                 build everything (validates first; aborts on errors)
 *   node tools/build-data.mjs --check         build in memory, compare with disk, write nothing (exit 2 if stale)
 *   node tools/build-data.mjs --only=grammar  or  --only=mimikara
 *   node tools/build-data.mjs --chunk-size=150
 *   node tools/build-data.mjs --strict        warnings fail the build too
 *   node tools/build-data.mjs --dry           validate + report sizes, write nothing
 *
 * Sources (first one that exists wins; move monoliths to data-src/ if you want them out of /data):
 *   data-src/mimikara/vocabulary.json   |  data/mimikara/vocabulary.json
 *   data-src/grammar-ref.json           |  content/grammar-ref.json
 *
 * Outputs (generated — never edit by hand; commit them, GitHub Pages does not run builds):
 *   data/mimikara/vocab/index.json, vocab-<level>-<nnn>.json, search.json
 *   data/grammar/index.json, lesson-<nnn>.json
 *
 * The small datasets (Shin Kanzen grammar, glossary, Temabetsu, content indexes) are only validated
 * and size-checked: splitting 9 KB files would add requests for no gain.
 */
import { readFile, writeFile, readdir, rename, unlink, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const CHECK = args.has('check'), DRY = args.has('dry'), STRICT = args.has('strict');
const ONLY = args.get('only') ? String(args.get('only')).split(',') : null;
const CHUNK = Math.max(25, Math.min(1000, Number(args.get('chunk-size')) || 200));
const want = (n) => !ONLY || ONLY.includes(n);

const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
const abs = (p) => join(ROOT, p);
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const pad = (n, w = 3) => String(n).padStart(w, '0');

async function readJSON(candidates, label) {
  for (const rel of candidates) {
    if (existsSync(abs(rel))) {
      const text = await readFile(abs(rel), 'utf8');
      try { return { rel, text, data: JSON.parse(text) }; }
      catch (e) { err(`${rel}: invalid JSON — ${e.message}`); return null; }
    }
  }
  err(`${label}: source not found (looked for ${candidates.join(' | ')})`);
  return null;
}

/* ───────── output plan: Map<relPath, string> ───────── */
const plan = new Map();
const put = (rel, obj, pretty = false) => { const s = JSON.stringify(obj, null, pretty ? 1 : 0) + '\n'; plan.set(rel, s); return s; };
const meta = (rel) => { const s = plan.get(rel); return { file: rel.split('/').pop(), bytes: Buffer.byteLength(s), gzip: gzipSync(s).length, sha: sha(s) }; };

/* ───────── MIMIKARA ───────── */
const KANA = /^[\u3040-\u30FF\u31F0-\u31FFー・〜～\s/（）()·,、]+$/;
async function mimikara() {
  const src = await readJSON(['data-src/mimikara/vocabulary.json', 'data/mimikara/vocabulary.json'], 'mimikara vocabulary');
  if (!src) return;
  const items = Array.isArray(src.data) ? src.data : null;
  if (!items) return err(`${src.rel}: expected a top-level array`);

  const seen = new Set(), pairs = new Map(); let noBn = 0;
  items.forEach((w, i) => {
    const at = `${src.rel}[${i}]`;
    if (!w || typeof w !== 'object') return err(`${at}: not an object`);
    if (!/^mimikara-n[1-5]-\d{4}$/.test(w.id || '')) err(`${at}: bad id "${w.id}"`);
    else if (seen.has(w.id)) err(`${at}: duplicate id ${w.id}`); else seen.add(w.id);
    if (!['N1', 'N2', 'N3', 'N4', 'N5'].includes(w.level)) err(`${at}: bad level "${w.level}"`);
    else if (w.id && !w.id.startsWith('mimikara-' + w.level.toLowerCase() + '-')) err(`${at}: id/level mismatch (${w.id} vs ${w.level})`);
    if (typeof w.furigana !== 'string' || !w.furigana.trim()) err(`${at}: furigana required`);
    else if (!KANA.test(w.furigana)) warn(`${at} ${w.id}: furigana has non-kana characters ("${w.furigana}")`);
    if (typeof w.english_meaning !== 'string' || !w.english_meaning.trim()) err(`${at} ${w.id}: english_meaning required`);
    if (!w.bengali_meaning || !String(w.bengali_meaning).trim()) noBn++;
    const key = (w.kanji || '') + '|' + (w.furigana || '');
    if (pairs.has(key)) warn(`${w.id}: same kanji+reading as ${pairs.get(key)}`); else pairs.set(key, w.id);
  });
  if (noBn) warn(`mimikara: ${noBn}/${items.length} entries have no bengali_meaning`);
  if (errors.length) return;

  const byLevel = {};
  for (const w of items) (byLevel[w.level] ||= []).push(w);
  const levels = {}, rows = [];
  for (const lv of Object.keys(byLevel).sort()) {
    const list = byLevel[lv].slice().sort((a, b) => a.id.localeCompare(b.id));
    const chunks = [];
    for (let i = 0, n = 1; i < list.length; i += CHUNK, n++) {
      const part = list.slice(i, i + CHUNK);
      const id = `${lv.toLowerCase()}-${pad(n)}`;
      const rel = `data/mimikara/vocab/vocab-${id}.json`;
      put(rel, { chunk: id, level: lv, items: part });
      chunks.push({ id, ...meta(rel), count: part.length, first: part[0].id, last: part.at(-1).id });
      for (const w of part) rows.push([w.id, w.kanji || '', w.furigana, w.romaji || '', String(w.english_meaning).slice(0, 80), id]);
    }
    levels[lv] = { count: list.length, chunks };
  }
  put('data/mimikara/vocab/search.json', { columns: ['id', 'kanji', 'furigana', 'romaji', 'en', 'chunk'], rows });
  put('data/mimikara/vocab/index.json', {
    generated: true, version: 1, source: { file: src.rel, sha: sha(src.text) },
    total: items.length, chunkSize: CHUNK, levels, search: meta('data/mimikara/vocab/search.json'),
  }, true);
}

/* ───────── GRAMMAR REFERENCE ───────── */
async function grammar() {
  const src = await readJSON(['data-src/grammar-ref.json', 'content/grammar-ref.json'], 'grammar-ref');
  if (!src) return;
  const items = Array.isArray(src.data) ? src.data : null;
  if (!items) return err(`${src.rel}: expected a top-level array`);

  const seen = new Set();
  items.forEach((g, i) => {
    const at = `${src.rel}[${i}] ${g && g.id}`;
    if (!g || typeof g !== 'object') return err(`${at}: not an object`);
    if (!g.id || typeof g.id !== 'string') err(`${at}: id required`);
    else if (seen.has(g.id)) err(`${at}: duplicate id`); else seen.add(g.id);
    if (!Number.isInteger(g.lesson) || g.lesson < 1 || g.lesson > 50) err(`${at}: lesson must be 1–50`);
    if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(g.jlpt)) err(`${at}: bad jlpt "${g.jlpt}"`);
    if (!g.pattern || !String(g.pattern).trim()) err(`${at}: pattern required`);
    if (!g.meaning_en) warn(`${at}: meaning_en missing`);
    if (!g.meaning_bn) warn(`${at}: meaning_bn missing`);
    if (!Array.isArray(g.examples) || !g.examples.length) err(`${at}: needs ≥1 example`);
    else g.examples.forEach((e, k) => { if (!e || !e.jp || !e.en) err(`${at}.examples[${k}]: jp and en required`); });
  });
  if (errors.length) return;

  const byLesson = new Map();
  for (const g of items) { if (!byLesson.has(g.lesson)) byLesson.set(g.lesson, []); byLesson.get(g.lesson).push(g); }
  const lessons = {};
  const index = [];
  for (const n of [...byLesson.keys()].sort((a, b) => a - b)) {
    const list = byLesson.get(n);
    const rel = `data/grammar/lesson-${pad(n)}.json`;
    put(rel, {
      lesson: n,
      items: list.map((g) => ({ id: g.id, pattern: g.pattern, lessonTitle: g.lessonTitle, meaning_en: g.meaning_en, meaning_bn: g.meaning_bn, notes: g.notes, examples: g.examples })),
    });
    lessons[n] = { ...meta(rel), count: list.length };
    // slim row: exactly the fields js/grammar-ref.js renders/filters on (jp,en,bn,romaji,example) + a count
    for (const g of list) {
      const ex0 = g.examples[0];
      index.push({ id: g.id, lesson: g.lesson, jlpt: g.jlpt, jp: g.jp || g.pattern, en: g.en || g.meaning_en || '', bn: g.bn || g.meaning_bn || '', romaji: g.romaji || ex0.romaji || '', example: g.example || ex0.jp, n: g.examples.length });
    }
  }
  put('data/grammar/index.json', { generated: true, version: 1, source: { file: src.rel, sha: sha(src.text) }, total: items.length, lessons, items: index });
}

/* ───────── validate-only datasets ───────── */
async function smallOnes() {
  const checks = [
    ['data/shin-kanzen/grammar.json', (d) => {
      if (!Array.isArray(d)) return err('shin-kanzen/grammar.json: expected array');
      const ids = new Set(); let noEx = 0;
      d.forEach((g, i) => {
        if (!g.id || ids.has(g.id)) err(`shin-kanzen/grammar.json[${i}]: missing/duplicate id ${g.id}`); else ids.add(g.id);
        if (!g.pattern) err(`shin-kanzen/grammar.json[${i}] ${g.id}: pattern required`);
        if (!['N5', 'N4', 'N3', 'N2', 'N1'].includes(g.level)) err(`shin-kanzen/grammar.json[${i}] ${g.id}: bad level`);
        if (!g.example_jp) noEx++;
      });
      if (noEx) warn(`shin-kanzen/grammar.json: ${noEx}/${d.length} entries have no example_jp`);
    }],
    ['data/mimikara/bengali_glossary.json', (d) => {
      if (!d || typeof d !== 'object' || Array.isArray(d)) return err('bengali_glossary.json: expected an object');
      for (const [k, v] of Object.entries(d)) if (typeof v !== 'string' || !v.trim()) warn(`bengali_glossary.json: empty value for "${k}"`);
    }],
    ['data/temabetsu/manifest.json', () => {}],
    ['data/temabetsu/intermediate-readings.json', () => {}],
    ['data/temabetsu/advanced-readings.json', () => {}],
    ['content/mimikara/index.json', () => {}],
    ['content/shinkanzen/index.json', () => {}],
  ];
  for (const [rel, fn] of checks) {
    if (!existsSync(abs(rel))) continue;
    const text = await readFile(abs(rel), 'utf8');
    let d; try { d = JSON.parse(text); } catch (e) { err(`${rel}: invalid JSON — ${e.message}`); continue; }
    fn(d);
    const raw = Buffer.byteLength(text);
    if (raw > 150 * 1024) warn(`${rel} is ${kb(raw)} — consider splitting it`);
  }
}

/* ───────── write / compare ───────── */
async function atomicWrite(rel, content) {
  const file = abs(rel);
  await mkdir(dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, file);
}
const GENERATED_NAME = /^(vocab-[a-z0-9]+-\d{3}|lesson-\d{3}|index|search)\.json$/;
async function staleFiles(dirRel, keep) {
  if (!existsSync(abs(dirRel))) return [];
  return (await readdir(abs(dirRel))).filter((f) => GENERATED_NAME.test(f) && !keep.has(`${dirRel}/${f}`)).map((f) => `${dirRel}/${f}`);
}

async function main() {
  if (want('mimikara')) await mimikara();
  if (want('grammar')) await grammar();
  if (!ONLY) await smallOnes();

  for (const w of warnings.slice(0, 25)) console.warn('⚠ ' + w);
  if (warnings.length > 25) console.warn(`⚠ …and ${warnings.length - 25} more warnings`);
  if (errors.length) {
    for (const e of errors.slice(0, 40)) console.error('✗ ' + e);
    if (errors.length > 40) console.error(`✗ …and ${errors.length - 40} more errors`);
    console.error(`\nFAILED: ${errors.length} error(s). Nothing was written.`);
    process.exit(1);
  }
  if (STRICT && warnings.length) { console.error(`\nFAILED (--strict): ${warnings.length} warning(s).`); process.exit(1); }

  const keep = new Set(plan.keys());
  const dirs = [];
  if (want('mimikara')) dirs.push('data/mimikara/vocab');
  if (want('grammar')) dirs.push('data/grammar');
  const stale = [];
  for (const d of dirs) stale.push(...await staleFiles(d, keep));

  let changed = 0, same = 0;
  for (const [rel, content] of plan) {
    const cur = existsSync(abs(rel)) ? await readFile(abs(rel), 'utf8') : null;
    if (cur === content) { same++; continue; }
    changed++;
    if (!CHECK && !DRY) await atomicWrite(rel, content);
  }
  if (!CHECK && !DRY) for (const rel of stale) await unlink(abs(rel));

  // report
  let raw = 0, gz = 0;
  for (const c of plan.values()) { raw += Buffer.byteLength(c); gz += gzipSync(c).length; }
  console.log(`\n${plan.size} generated files · ${kb(raw)} raw · ${kb(gz)} gzipped (chunk size ${CHUNK})`);
  const first = { 'data/mimikara/vocab/index.json': 'loaded first', 'data/mimikara/vocab/search.json': 'loaded only when searching', 'data/grammar/index.json': 'loaded by grammar.html (was 276 KB)' };
  for (const [rel, note] of Object.entries(first)) {
    if (plan.has(rel)) { const m = meta(rel); console.log(`  ${rel.padEnd(34)} ${kb(m.bytes).padStart(9)}  (${kb(m.gzip)} gz)  ${note}`); }
  }
  const biggest = [...plan.keys()].map((r) => [r, meta(r).bytes]).sort((a, b) => b[1] - a[1])[0];
  if (biggest) console.log(`  largest generated file: ${biggest[0]} (${kb(biggest[1])})`);
  console.log(`  ${changed} changed, ${same} unchanged, ${stale.length} stale ${CHECK || DRY ? 'would be removed' : 'removed'}`);

  if (CHECK) {
    if (changed || stale.length) { console.error('\n✗ generated data is out of date — run: node tools/build-data.mjs'); process.exit(2); }
    console.log('\n✓ generated data is up to date');
  } else if (DRY) console.log('\n(dry run — nothing written)');
  else console.log('\n✓ done');
}

main().catch((e) => { console.error('✗ build-data crashed:', e); process.exit(1); });
