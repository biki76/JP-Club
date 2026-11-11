// Run: node --test tests/voice/moon-start.test.mjs
// The first greeting must be the fixed, checked sentence and must not call the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGIN = 'https://biki76.github.io';

async function load(upstream) {
  const dir = mkdtempSync(join(tmpdir(), 'moon-'));
  const src = readFileSync(join(ROOT, 'supabase/functions/voice-tutor/index.ts'), 'utf8')
    .replace(/import \{ createClient \} from "https:\/\/esm\.sh\/[^"]+";/, 'import { createClient } from "./stub.mjs";');
  writeFileSync(join(dir, 'index.ts'), src);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  writeFileSync(join(dir, 'stub.mjs'), 'export const createClient = () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } });');
  globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: 'https://x', SUPABASE_ANON_KEY: 'a', GROQ_API_KEY: 'g', ALLOWED_ORIGINS: ORIGIN })[k] }, serve: (h) => { globalThis.__h = h; } };
  globalThis.fetch = upstream;
  await import(pathToFileURL(join(dir, 'index.ts')).href + '?t=' + Math.random());
  return { handler: globalThis.__h, dir };
}
const req = (body) => new Request('https://x/f', { method: 'POST', headers: { Origin: ORIGIN, Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('start: fixed greeting, model never called', async () => {
  let called = false;
  const { handler, dir } = await load(async () => { called = true; return new Response('{}'); });
  const j = await (await handler(req({ text: '', start: true, lang: 'bn', level: 'N5' }))).json();
  assert.equal(called, false, 'model must not be called for the greeting');
  assert.equal(j.reply, 'こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。');
  assert.ok(!j.reply.includes('きょう'), 'must never say きょう');
  assert.ok(j.translation.length > 0);
  rmSync(dir, { recursive: true, force: true });
});

test('start: English learner gets the English gloss', async () => {
  const { handler, dir } = await load(async () => new Response('{}'));
  const j = await (await handler(req({ text: '', start: true, lang: 'en' }))).json();
  assert.match(j.translation, /I am Moon/);
  rmSync(dir, { recursive: true, force: true });
});

test('normal turns still call the model', async () => {
  let called = false;
  const { handler, dir } = await load(async () => { called = true; return new Response(JSON.stringify({ choices: [{ message: { content: 'JP: はい。\nTR: yes\nFIX: none' } }] })); });
  const j = await (await handler(req({ text: 'はい', level: 'N5', lang: 'bn' }))).json();
  assert.equal(called, true); assert.ok(j.reply);
  rmSync(dir, { recursive: true, force: true });
});
