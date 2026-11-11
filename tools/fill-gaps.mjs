#!/usr/bin/env node
/* tools/fill-gaps.mjs — finds missing Bengali glosses and missing Shin Kanzen examples,
 * writes a worklist, and merges reviewed translations back in.
 *
 *   node tools/fill-gaps.mjs report                  count gaps, write data-gaps/*.json worklists
 *   node tools/fill-gaps.mjs merge <file.json>       merge a reviewed batch into the data (validated first)
 *
 * Batch file format (JSON array):
 *   mimikara:      [{ "id": "mimikara-n3-0002", "bengali_meaning": "..." }]
 *   shin-kanzen:   [{ "id": "sk-n3-002", "example_jp": "...", "example_en": "...", "example_bn": "...", "meaning_bn": "..." }]
 *
 * Rules enforced on merge:
 *  - ids must exist and currently be empty (no silent overwrites); use --overwrite to replace
 *  - Bengali must contain Bengali script (U+0980–U+09FF); Japanese must contain kana/kanji
 *  - no placeholders ("TODO", "...", "?", "xxx", "—") and no English in Bengali fields
 *  - the file is written atomically, only if every entry in the batch passes
 */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [, , cmd, file] = process.argv;
const overwrite = process.argv.includes('--overwrite');
const MIM = join(ROOT, 'data/mimikara/vocabulary.json');
const SK = join(ROOT, 'data/shin-kanzen/grammar.json');
const BN = /[\u0980-\u09FF]/, JP = /[\u3040-\u30FF\u4E00-\u9FFF]/;
const PLACEHOLDER = /^\s*(todo|tbd|xxx|\?+|-+|—|\.\.\.|n\/a|none)\s*$/i;

const load = async (p) => JSON.parse(await readFile(p, 'utf8'));
const bnEmpty = (v) => v == null || String(v).trim() === '';

function checkBn(id, field, v) {
  const errs = [];
  const s = String(v ?? '').trim();
  if (!s) errs.push(`${id}.${field}: empty`);
  else if (PLACEHOLDER.test(s)) errs.push(`${id}.${field}: placeholder "${s}"`);
  else if (!BN.test(s)) errs.push(`${id}.${field}: no Bengali characters ("${s.slice(0, 40)}")`);
  else if (/[A-Za-z]{4,}/.test(s)) errs.push(`${id}.${field}: contains English ("${s.slice(0, 60)}")`);
  return errs;
}
function checkJp(id, field, v) {
  const s = String(v ?? '').trim();
  if (!s) return [`${id}.${field}: empty`];
  if (PLACEHOLDER.test(s)) return [`${id}.${field}: placeholder`];
  if (!JP.test(s)) return [`${id}.${field}: no Japanese characters`];
  return [];
}

async function report() {
  const mim = await load(MIM), items = Array.isArray(mim) ? mim : mim.data;
  const gapM = items.filter((w) => bnEmpty(w.bengali_meaning));
  const sk = await load(SK);
  const gapS = sk.filter((g) => !g.example_jp || !g.example_en || !g.example_bn);
  mkdirSync(join(ROOT, 'data-gaps'), { recursive: true });
  // chunk mimikara into 100-item worklists so each batch is reviewable
  let n = 0;
  for (let i = 0; i < gapM.length; i += 100) {
    n++;
    const part = gapM.slice(i, i + 100).map((w) => ({ id: w.id, kanji: w.kanji, furigana: w.furigana, english_meaning: w.english_meaning, bengali_meaning: '' }));
    await writeFile(join(ROOT, `data-gaps/mimikara-batch-${String(n).padStart(2, '0')}.json`), JSON.stringify(part, null, 1) + '\n');
  }
  await writeFile(join(ROOT, 'data-gaps/shin-kanzen-batch-01.json'), JSON.stringify(gapS.map((g) => ({
    id: g.id, pattern: g.pattern, meaning_en: g.meaning_en, meaning_bn: g.meaning_bn || '',
    example_jp: g.example_jp || '', example_en: g.example_en || '', example_bn: g.example_bn || '',
  })), null, 1) + '\n');
  console.log(`mimikara: ${gapM.length}/${items.length} missing bengali_meaning → ${n} batch file(s) of ≤100 in data-gaps/`);
  console.log(`shin-kanzen: ${gapS.length}/${sk.length} entries missing an example → data-gaps/shin-kanzen-batch-01.json`);
}

async function merge() {
  if (!file) { console.error('usage: merge <batch.json> [--overwrite]'); process.exit(2); }
  const batch = await load(resolve(file));
  if (!Array.isArray(batch) || !batch.length) { console.error('batch must be a non-empty array'); process.exit(2); }
  const errors = [];
  const isSK = batch.some((b) => /^sk-/.test(b.id));
  const target = isSK ? SK : MIM;
  const raw = await load(target);
  const items = Array.isArray(raw) ? raw : raw.data;
  const byId = new Map(items.map((x) => [x.id, x]));
  const seen = new Set();

  for (const b of batch) {
    const row = byId.get(b.id);
    if (!row) { errors.push(`${b.id}: not found in ${target.split('/').slice(-2).join('/')}`); continue; }
    if (seen.has(b.id)) { errors.push(`${b.id}: duplicated in batch`); continue; }
    seen.add(b.id);
    if (isSK) {
      for (const f of ['example_jp', 'example_en', 'example_bn', 'meaning_bn']) if (b[f] !== undefined) {
        if (!overwrite && !bnEmpty(row[f]) && row[f] !== b[f]) { errors.push(`${b.id}.${f}: already set (use --overwrite)`); continue; }
        if (f === 'example_jp') errors.push(...checkJp(b.id, f, b[f]));
        else if (f === 'example_en') { if (!String(b[f] || '').trim() || PLACEHOLDER.test(b[f])) errors.push(`${b.id}.${f}: empty/placeholder`); }
        else errors.push(...checkBn(b.id, f, b[f]));
      }
    } else {
      if (!overwrite && !bnEmpty(row.bengali_meaning)) { errors.push(`${b.id}: already has bengali_meaning (use --overwrite)`); continue; }
      errors.push(...checkBn(b.id, 'bengali_meaning', b.bengali_meaning));
    }
  }
  if (errors.length) {
    console.error(`✗ ${errors.length} problem(s). Nothing was written.\n` + errors.slice(0, 40).map((e) => '  ' + e).join('\n'));
    process.exit(1);
  }
  for (const b of batch) {
    const row = byId.get(b.id);
    for (const [k, v] of Object.entries(b)) if (k !== 'id' && v !== undefined) row[k] = String(v).trim();
  }
  const out = Array.isArray(raw) ? items : { ...raw, data: items };
  const tmp = target + '.tmp';
  await writeFile(tmp, JSON.stringify(out, null, 2) + '\n', 'utf8');
  await rename(tmp, target);
  console.log(`✓ merged ${batch.length} entr${batch.length === 1 ? 'y' : 'ies'} into ${target.split('/').slice(-2).join('/')}`);
}

if (cmd === 'report') await report();
else if (cmd === 'merge') await merge();
else { console.log('usage: node tools/fill-gaps.mjs report | merge <batch.json> [--overwrite]'); process.exit(cmd ? 2 : 0); }
