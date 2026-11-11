#!/usr/bin/env node
/* tests/voice/run-voice.mjs — behavioural tests for the two voice edge functions.
 * Loads each index.ts with a fake Deno + fake Supabase auth + fake upstream fetch.
 * No network, no Deno needed. Needs Node ≥ 22.6 (type stripping).
 *   node tests/voice/run-voice.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGIN = 'https://biki76.github.io';

/* Build an importable copy: swap the esm.sh import for a local stub, keep TS types (stripped by Node). */
function load(fn, envVars, upstream, auth) {
  const dir = mkdtempSync(join(tmpdir(), 'voice-'));
  const src = readFileSync(join(ROOT, fn), 'utf8')
    .replace(/import \{ createClient \} from "https:\/\/esm\.sh\/[^"]+";/, 'import { createClient } from "./stub-client.mjs";');
  const file = join(dir, 'index.ts');
  writeFileSync(file, src);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  writeFileSync(join(dir, 'stub-client.mjs'), `export const createClient = () => (${auth.toString()})();`);
  globalThis.Deno = {
    env: { get: (k) => envVars[k] },
    serve: (h) => { globalThis.__handler = h; },
  };
  globalThis.fetch = upstream;
  return import(pathToFileURL(file).href + '?t=' + Math.random()).then(() => ({ handler: globalThis.__handler, dir }));
}
const goodAuth = () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } });
const badAuth = () => ({ auth: { getUser: async () => ({ data: { user: null } }) } });
const req = (body, extra = {}) => new Request('https://x/functions/v1/f', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Authorization: 'Bearer t', ...extra.headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'a', CF_ACCOUNT_ID: 'acc', CF_API_TOKEN: 'secret-cf-token', GROQ_API_KEY: 'secret-groq-key' };
const quietLog = () => { const orig = console.error; console.error = () => {}; return () => { console.error = orig; }; };

/* ───── voice-speak ───── */
test('speak: upstream 500 → generic 502 to browser, no Cloudflare text leaked', async () => {
  const restore = quietLog();
  const { handler, dir } = await load('supabase/functions/voice-speak/index.ts', ENV,
    async () => new Response('{"errors":[{"message":"model overloaded secret-internal-detail"}]}', { status: 500 }), goodAuth);
  const res = await handler(req({ text: 'こんにちは' }));
  restore();
  const body = await res.text();
  assert.equal(res.status, 502);
  assert.match(body, /"code":"upstream"/);
  assert.ok(!body.includes('overloaded') && !body.includes('secret-internal'), 'upstream detail must not reach the browser');
  assert.ok(!body.includes('secret-cf-token'));
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  rmSync(dir, { recursive: true, force: true });
});

test('speak: tries lang "jp" then "ja" and returns audio on success', async () => {
  const langs = [];
  const { handler, dir } = await load('supabase/functions/voice-speak/index.ts', ENV, async (_u, init) => {
    langs.push(JSON.parse(init.body).lang);
    return langs.length === 1 ? new Response('bad lang', { status: 400 }) : new Response(JSON.stringify({ result: { audio: 'BASE64' } }), { status: 200 });
  }, goodAuth);
  const j = await (await handler(req({ text: 'はい' }))).json();
  assert.deepEqual(langs, ['jp', 'ja']); assert.equal(j.audio, 'BASE64');
  rmSync(dir, { recursive: true, force: true });
});

test('speak: 200 without audio is treated as failure, not success', async () => {
  const restore = quietLog();
  const { handler, dir } = await load('supabase/functions/voice-speak/index.ts', ENV, async () => new Response('{"result":{}}', { status: 200 }), goodAuth);
  const res = await handler(req({ text: 'はい' })); restore();
  assert.equal(res.status, 502); assert.equal((await res.json()).code, 'upstream');
  rmSync(dir, { recursive: true, force: true });
});

test('speak: missing CF secrets → 503 unavailable, upstream never called', async () => {
  const restore = quietLog(); let called = false;
  const { handler, dir } = await load('supabase/functions/voice-speak/index.ts', { ...ENV, CF_API_TOKEN: undefined }, async () => { called = true; return new Response('{}'); }, goodAuth);
  const res = await handler(req({ text: 'はい' })); restore();
  assert.equal(res.status, 503); assert.equal(called, false);
  rmSync(dir, { recursive: true, force: true });
});

test('speak: unauthenticated → 401; bad origin → 403; text capped to 300 chars', async () => {
  const { handler, dir } = await load('supabase/functions/voice-speak/index.ts', ENV, async () => new Response('{"result":{"audio":"x"}}'), badAuth);
  assert.equal((await handler(req({ text: 'a' }))).status, 401);
  rmSync(dir, { recursive: true, force: true });
  const r2 = await load('supabase/functions/voice-speak/index.ts', ENV, async () => new Response('{}'), goodAuth);
  assert.equal((await r2.handler(req({ text: 'a' }, { headers: { Origin: 'https://evil.example' } }))).status, 403);
  let sent = '';
  const r3 = await load('supabase/functions/voice-speak/index.ts', ENV, async (_u, i) => { sent = JSON.parse(i.body).prompt; return new Response('{"result":{"audio":"x"}}'); }, goodAuth);
  await r3.handler(req({ text: 'あ'.repeat(900) }));
  assert.equal(sent.length, 300);
  rmSync(r2.dir, { recursive: true, force: true }); rmSync(r3.dir, { recursive: true, force: true });
});

/* ───── voice-tutor ───── */
const GROQ_OK = (content) => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

test('tutor: upstream error → generic message, Groq body never shown', async () => {
  const restore = quietLog();
  const { handler, dir } = await load('supabase/functions/voice-tutor/index.ts', ENV,
    async () => new Response('{"error":{"message":"rate limit for org_secret_123"}}', { status: 429 }), goodAuth);
  const res = await handler(req({ level: 'N5', text: 'はい', history: [] })); restore();
  const body = await res.text();
  assert.equal(res.status, 429);
  assert.ok(!body.includes('org_secret') && !body.includes('rate limit for'), 'upstream detail must not reach the browser');
  assert.match(body, /"code":"busy"/);
  rmSync(dir, { recursive: true, force: true });
});

test('tutor: 500 upstream → 502 upstream code', async () => {
  const restore = quietLog();
  const { handler, dir } = await load('supabase/functions/voice-tutor/index.ts', ENV, async () => new Response('boom', { status: 500 }), goodAuth);
  const res = await handler(req({ level: 'N5', text: 'はい' })); restore();
  assert.equal(res.status, 502); assert.equal((await res.json()).code, 'upstream');
  rmSync(dir, { recursive: true, force: true });
});

test('tutor: network timeout/failure → 504 timeout', async () => {
  const restore = quietLog();
  const { handler, dir } = await load('supabase/functions/voice-tutor/index.ts', ENV, async () => { throw new TypeError('fetch failed'); }, goodAuth);
  const res = await handler(req({ level: 'N5', text: 'はい' })); restore();
  assert.equal(res.status, 504); assert.equal((await res.json()).code, 'timeout');
  rmSync(dir, { recursive: true, force: true });
});

test('tutor: happy path returns parsed reply / translation fields', async () => {
  const content = 'REPLY: そうですか。\nTR: তাই নাকি?\nFIX: none\nTIP: none';
  const { handler, dir } = await load('supabase/functions/voice-tutor/index.ts', ENV, GROQ_OK(content), goodAuth);
  const res = await handler(req({ level: 'N5', text: 'はい' }));
  const j = await res.json();
  assert.equal(res.status, 200); assert.ok(j.reply, 'reply present'); assert.ok(!('error' in j));
  rmSync(dir, { recursive: true, force: true });
});

test('tutor: GROQ key missing → 503, malformed body → 400', async () => {
  const restore = quietLog();
  const a = await load('supabase/functions/voice-tutor/index.ts', { ...ENV, GROQ_API_KEY: undefined }, GROQ_OK('x'), goodAuth);
  assert.equal((await a.handler(req({ level: 'N5', text: 'a' }))).status, 503);
  const b = await load('supabase/functions/voice-tutor/index.ts', ENV, GROQ_OK('x'), goodAuth);
  assert.equal((await b.handler(req('{oops'))).status, 400);
  assert.equal((await b.handler(req('[1,2]'))).status, 400);
  restore();
  rmSync(a.dir, { recursive: true, force: true }); rmSync(b.dir, { recursive: true, force: true });
});

test('tutor: no secret or upstream text appears in ANY error body', async () => {
  const restore = quietLog();
  const cases = [
    await load('supabase/functions/voice-tutor/index.ts', ENV, async () => { throw new Error('secret-groq-key leaked in stack'); }, goodAuth),
    await load('supabase/functions/voice-tutor/index.ts', ENV, async () => new Response('secret-groq-key', { status: 500 }), goodAuth),
  ];
  for (const c of cases) {
    const txt = await (await c.handler(req({ level: 'N5', text: 'a' }))).text();
    assert.ok(!txt.includes('secret-groq-key'), txt);
    rmSync(c.dir, { recursive: true, force: true });
  }
  restore();
});
