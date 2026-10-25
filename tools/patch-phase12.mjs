#!/usr/bin/env node
// One-shot patch: applies Phase 12 head + script edits to the 8 content pages.
// Idempotent — safe to re-run. Preserves existing formatting.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PAGES = [
  'home.html', 'lesson.html', 'flashcards.html', 'quiz.html',
  'kanji.html', 'search.html', 'progress.html', 'placement.html'
];

const HEAD_BLOCK = `  <!-- Phase 12 — auth + cloud sync -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="css/cloud.css" />
`;

const SCRIPT_BLOCK = `  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  <script src="js/supabase-config.js" defer></script>
  <script src="js/cloud.js" defer></script>
`;

let patched = 0, skipped = 0, errored = 0;

for (const page of PAGES) {
  const path = resolve(ROOT, page);
  let html;
  try { html = await readFile(path, 'utf8'); }
  catch (e) { console.error(`  ✗ ${page}: ${e.code}`); errored++; continue; }

  if (html.includes('js/cloud.js')) {
    console.log(`  ↺ ${page}: already patched`);
    skipped++; continue;
  }

  if (!/<\/head>/.test(html)) {
    console.error(`  ✗ ${page}: no </head>`); errored++; continue;
  }
  html = html.replace(/<\/head>/, HEAD_BLOCK + '</head>');

  if (!/<script src="js\/shell\.js" defer><\/script>/.test(html)) {
    console.error(`  ✗ ${page}: no shell.js anchor`); errored++; continue;
  }
  html = html.replace(
    /<script src="js\/shell\.js" defer><\/script>/,
    '<script src="js/shell.js" defer></script>\n' + SCRIPT_BLOCK.trimEnd()
  );

  await writeFile(path, html, 'utf8');
  console.log(`  ✓ ${page}`);
  patched++;
}

console.log(`\nDone. patched=${patched} skipped=${skipped} errored=${errored}`);
if (errored) process.exit(1);
