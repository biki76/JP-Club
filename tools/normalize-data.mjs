#!/usr/bin/env node
// tools/normalize-data.mjs
// Normalizes lesson JSON data. Dry-run by default; use --write to apply.
// Reports: tools/output/translation-queue.json, tools/output/placeholder-report.json

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LESSONS_DIR = join(ROOT, 'data', 'lessons');
const OUT_DIR = join(__dirname, 'output');

const WRITE = process.argv.includes('--write');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

function listLessonDirs() {
  if (!existsSync(LESSONS_DIR)) throw new Error('Missing: ' + LESSONS_DIR);
  return readdirSync(LESSONS_DIR)
    .filter((n) => n.startsWith('minna-') && statSync(join(LESSONS_DIR, n)).isDirectory())
    .sort();
}

console.log(`normalize-data: mode=${WRITE ? 'WRITE' : 'dry-run'} root=${ROOT}`);
const lessons = listLessonDirs();
console.log(`found ${lessons.length} lesson folders`);

// --- grammar normalization ---
// Flat shape { example_jp, example_en } -> { examples: [{ jp, en }] }

const BN_PLACEHOLDERS = new Set(['', 'Meaning', 'অর্থ', 'অর্থ:']);

function isPlaceholderBn(bn) {
  if (typeof bn !== 'string') return true;
  return BN_PLACEHOLDERS.has(bn.trim());
}

function normalizeGrammarEntry(entry, lessonId, queues) {
  const changes = [];
  const id = entry.id || entry.pattern || `${lessonId}-grammar`;
  if (!Array.isArray(entry.examples) && (entry.example_jp || entry.example_en)) {
    entry.examples = [{ jp: entry.example_jp || '', en: entry.example_en || '' }];
    delete entry.example_jp;
    delete entry.example_en;
    changes.push(`${id}: flat-example -> examples[]`);
  }
  if (isPlaceholderBn(entry.meaning_bn) && entry.meaning_en) {
    entry.meaning_bn = entry.meaning_en;
    queues.translation.push({
      lesson: lessonId, kind: 'grammar', id,
      field: 'meaning_bn', from: entry.meaning_en
    });
    changes.push(`${id}: meaning_bn from meaning_en`);
  }
  return changes;
}

function collectGrammar(lessonDir, lessonId, queues) {
  const p = join(lessonDir, 'grammar.json');
  if (!existsSync(p)) return { data: null, changes: [] };
  const data = readJson(p);
  const entries = Array.isArray(data) ? data : (data.patterns || data.items || []);
  const changes = [];
  for (const e of entries) changes.push(...normalizeGrammarEntry(e, lessonId, queues));
  return { data, changes };
}
import { mkdirSync } from 'node:fs';

// --- placeholder kanji scan ---
function collectKanjiPlaceholders(lessonDir, lessonId, queue) {
  const p = join(lessonDir, 'kanji.json');
  if (!existsSync(p)) return 0;
  const data = readJson(p);
  const entries = Array.isArray(data) ? data : (data.items || data.kanji || []);
  let n = 0;
  for (const e of entries) {
    const meaning = e.meaning_en || '';
    if (e.strokes === 0 || meaning === 'Meaning' || meaning === '') {
      queue.push({ lesson: lessonId, kanji: e.kanji || e.char || '?' });
      n++;
    }
  }
  return n;
}

// --- stub vocab scan ---
function countVocab(lessonDir) {
  const p = join(lessonDir, 'vocabulary.json');
  if (!existsSync(p)) return 0;
  const data = readJson(p);
  const entries = Array.isArray(data) ? data : (data.items || data.words || []);
  return entries.length;
}

// --- main ---
const queues = { translation: [], placeholderKanji: [], stubLessons: [], changes: 0 };
for (const lessonId of lessons) {
  const dir = join(LESSONS_DIR, lessonId);
  const { changes } = collectGrammar(dir, lessonId, queues);
  queues.changes += changes.length;
  collectKanjiPlaceholders(dir, lessonId, queues.placeholderKanji);
  const vc = countVocab(dir);
  if (vc < 10) queues.stubLessons.push({ lesson: lessonId, vocab: vc });
}

// --- reports ---
console.log(`\nchanges:          ${queues.changes}`);
console.log(`translation-queue: ${queues.translation.length}`);
console.log(`placeholder-kanji: ${queues.placeholderKanji.length}`);
console.log(`stub-lessons:     ${queues.stubLessons.length}`);

mkdirSync(OUT_DIR, { recursive: true });
writeJson(join(OUT_DIR, 'translation-queue.json'), queues.translation);
writeJson(join(OUT_DIR, 'placeholder-report.json'), {
  generatedAt: new Date().toISOString(),
  placeholderKanji: queues.placeholderKanji,
  stubLessons: queues.stubLessons
});
console.log(`reports -> ${OUT_DIR}`);

// --- write branch ---
if (WRITE) {
  let written = 0;
  for (const lessonId of lessons) {
    const p = join(LESSONS_DIR, lessonId, 'grammar.json');
    if (!existsSync(p)) continue;
    const original = readFileSync(p, 'utf8');
    const data = JSON.parse(original);
    const entries = Array.isArray(data) ? data : (data.patterns || data.items || []);
    const seen = { translation: [] };
    let touched = false;
    for (const e of entries) {
      if (normalizeGrammarEntry(e, lessonId, seen).length) touched = true;
    }
    if (!touched) continue;
    writeFileSync(p + '.bak', original);
    writeJson(p, data);
    written++;
  }
  console.log(`wrote ${written} grammar.json files (.bak backups saved)`);
}
