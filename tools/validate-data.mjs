#!/usr/bin/env node
/* tools/validate-data.mjs
 * Walks data/lessons/, validates every JSON file against js/data-schemas.js.
 * Exit code: 0 on pass, 1 on any error (warnings do not fail).
 *
 *   node tools/validate-data.mjs
 */
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { schemas, validate, validateCollection } = require('../js/data-schemas.js');

const DATA_ROOT = fileURLToPath(new URL('../data/lessons/', import.meta.url));
const counts = { ok: 0, errors: 0, warnings: 0 };
const errorList = [];

function rel(p) { return p.replace(DATA_ROOT, ''); }
function ok(m)   { counts.ok++;       console.log(`  ✓ ${m}`); }
function fail(m) { counts.errors++;   errorList.push(m); console.error(`  ✗ ${m}`); }
function warn(m) { counts.warnings++; console.warn(`  ⚠ ${m}`); }

async function readJson(p) {
  const raw = await readFile(p, 'utf8');
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`invalid JSON: ${e.message}`); }
}

async function validateFile(path, kind, isCollection) {
  try {
    const data = await readJson(path);
    const schema = schemas[kind];
    const result = isCollection
      ? validateCollection(data, schema, rel(path))
      : validate(data, schema, rel(path), []);
    if (result.valid) ok(rel(path));
    else result.errors.forEach(e => fail(`${e.path} ${e.message}`));
    return result.valid ? data : null;
  } catch (e) {
    fail(`${rel(path)}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('Validating Japanese learning data…\n');

  console.log('▸ index');
  const index = await validateFile(join(DATA_ROOT, 'index.json'), 'index', false);
  if (!index) {
    console.log('\nFAIL ✗ — cannot continue without a valid index.json');
    process.exit(1);
  }

  const seenManifests = new Set();
  const seenSlugs     = new Set();

  for (const mPath of index.manifests) {
    seenManifests.add(mPath);
    const full = join(DATA_ROOT, mPath);
    console.log(`\n▸ ${mPath}`);

    try { await stat(full); }
    catch { fail(`${mPath}: declared in index.json but file not found`); continue; }

    const manifest = await validateFile(full, 'manifest', false);
    if (!manifest) continue;
    seenSlugs.add(manifest.slug);

    const dir = dirname(full);
    const df  = manifest.dataFiles || {};

    for (const [kind, relPath] of [
      ['vocabulary', df.vocabulary],
      ['grammar',    df.grammar],
      ['kanji',      df.kanji]
    ]) {
      if (!relPath) continue;
      const p = join(dir, relPath);
      try { await stat(p); }
      catch { fail(`${rel(p)}: declared in manifest but not found`); continue; }

      const data = await validateFile(p, kind, true);
      if (!data) continue;

      if (kind === 'kanji') {
        const chars = new Set();
        data.forEach((item, i) => {
          if (!item || !item.character) return;
          if (chars.has(item.character))
            fail(`${rel(p)}[${i}].character: duplicate "${item.character}"`);
          chars.add(item.character);
        });
      }

      if (kind === 'vocabulary' && manifest.slug) {
        data.forEach((item, i) => {
          if (item.id && !item.id.startsWith(manifest.slug))
            warn(`${rel(p)}[${i}].id "${item.id}" does not start with "${manifest.slug}-"`);
        });
      }
    }
  }

  // Orphan folders
  try {
    const entries = await readdir(DATA_ROOT, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (!seenSlugs.has(e.name) && !seenManifests.has(`${e.name}/manifest.json`))
        warn(`${e.name}/ exists but is not listed in index.json`);
    }
  } catch {}

  console.log('\n' + '─'.repeat(48));
  const pass = counts.errors === 0;
  console.log(
    `${pass ? 'PASS ✓' : 'FAIL ✗'} — ` +
    `${counts.ok} file(s) ok · ${counts.errors} error(s) · ${counts.warnings} warning(s)`
  );
  if (!pass) {
    console.log('\nErrors:');
    errorList.forEach(e => console.log('  • ' + e));
  }
  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
