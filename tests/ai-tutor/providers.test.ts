// Run: node tests/run-ts.mjs   (or: npm test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, streamGroq, streamGemini, ProviderError } from '../../supabase/functions/ai-tutor/lib/providers.ts';
import type { ChatMsg } from '../../supabase/functions/ai-tutor/lib/providers.ts';
import { parseBody, sanitizeText, HttpError } from '../../supabase/functions/ai-tutor/lib/validate.ts';
import { buildSystemPrompt } from '../../supabase/functions/ai-tutor/lib/prompts.ts';

const enc = new TextEncoder();
const MSGS: ChatMsg[] = [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }];
const OPTS = { maxTokens: 50, temperature: 0.3 };

function sse(chunks: string[], failAfter = -1): Response {
  let i = 0;
  const body = new ReadableStream({
    pull(c) {
      if (failAfter >= 0 && i === failAfter) { c.error(new Error('socket reset')); return; }
      if (i >= chunks.length) { c.close(); return; }
      c.enqueue(enc.encode(chunks[i++]));
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
const groqChunk = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
const geminiChunk = (t: string) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\n\n`;

async function collect(g: AsyncGenerator<string>) { let s = ''; for await (const p of g) s += p; return s; }

const realFetch = globalThis.fetch;
function mockFetch(fn: (url: string) => Response | Promise<Response>) {
  globalThis.fetch = (async (u: any) => fn(String(u))) as typeof fetch;
}

test('groq stream is assembled across split SSE frames', async () => {
  const frames = [groqChunk('こん'), groqChunk('にちは').slice(0, 20), groqChunk('にちは').slice(20), 'data: [DONE]\n\n'];
  mockFetch(() => sse(frames));
  assert.equal(await collect(streamGroq(MSGS, 'm', 'k', OPTS)), 'こんにちは');
  globalThis.fetch = realFetch;
});

test('gemini stream parses candidates and sends the key as a header', async () => {
  let seen: any;
  globalThis.fetch = (async (u: any, init: any) => { seen = { u: String(u), h: init.headers }; return sse([geminiChunk('は'), geminiChunk('い')]); }) as typeof fetch;
  assert.equal(await collect(streamGemini(MSGS, 'gemini-x', 'KEY', OPTS)), 'はい');
  assert.ok(!seen.u.includes('KEY'), 'API key must not be in the URL');
  assert.equal(seen.h['x-goog-api-key'], 'KEY');
  globalThis.fetch = realFetch;
});

test('fails over to the fallback when the primary returns 429', async () => {
  mockFetch((u) => (u.includes('groq') ? new Response('slow down', { status: 429 }) : sse([geminiChunk('OK')])));
  const used: string[] = [];
  const out = await collect(generate([
    { name: 'groq', run: (m, o) => streamGroq(m, 'm', 'k', o) },
    { name: 'gemini', run: (m, o) => streamGemini(m, 'm', 'k', o) },
  ], MSGS, OPTS, (n) => used.push(n)));
  assert.equal(out, 'OK');
  assert.deepEqual(used, ['groq', 'gemini']);
  globalThis.fetch = realFetch;
});

test('does NOT fail over once tokens were streamed (mid-stream error surfaces)', async () => {
  mockFetch((u) => (u.includes('groq') ? sse([groqChunk('は'), groqChunk('い')], 2) : sse([geminiChunk('X')])));
  const got: string[] = [];
  await assert.rejects(async () => {
    for await (const p of generate([
      { name: 'groq', run: (m, o) => streamGroq(m, 'm', 'k', o) },
      { name: 'gemini', run: (m, o) => streamGemini(m, 'm', 'k', o) },
    ], MSGS, OPTS)) got.push(p);
  }, (e: any) => e instanceof ProviderError && e.started === true);
  assert.equal(got.join(''), 'はい');
  globalThis.fetch = realFetch;
});

test('all providers down → last error is thrown', async () => {
  mockFetch(() => new Response('x', { status: 503 }));
  await assert.rejects(collect(generate([
    { name: 'groq', run: (m, o) => streamGroq(m, 'm', 'k', o) },
    { name: 'gemini', run: (m, o) => streamGemini(m, 'm', 'k', o) },
  ], MSGS, OPTS)), ProviderError);
  globalThis.fetch = realFetch;
});

test('network failure is classified retryable', async () => {
  globalThis.fetch = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
  await assert.rejects(collect(streamGroq(MSGS, 'm', 'k', OPTS)), (e: any) => e instanceof ProviderError && e.retryable && !e.started);
  globalThis.fetch = realFetch;
});

test('client abort stops generation without failing over', async () => {
  const ctl = new AbortController();
  globalThis.fetch = (async (_u: any, init: any) => new Promise<Response>((_res, rej) => {
    init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
  })) as typeof fetch;
  const p = collect(generate([{ name: 'groq', run: (m, o) => streamGroq(m, 'm', 'k', o) }], MSGS, { ...OPTS, signal: ctl.signal }));
  setTimeout(() => ctl.abort(), 20);
  await assert.rejects(p);
  globalThis.fetch = realFetch;
});

/* ---------- validation ---------- */
const ok = { action: 'send_message', message: 'こんにちは', level: 'N4', sessionId: '123e4567-e89b-42d3-a456-426614174000' };

test('parseBody accepts a valid request and applies defaults', () => {
  const r = parseBody(JSON.stringify(ok));
  assert.equal(r.level, 'N4'); assert.equal(r.mode, 'chat'); assert.equal(r.lang, 'bn'); assert.equal(r.stream, false);
});
test('parseBody rejects bad input with typed errors', () => {
  const bad = (o: unknown, code: string) => assert.throws(() => parseBody(JSON.stringify(o)), (e: any) => e instanceof HttpError && e.code === code);
  bad({ ...ok, action: 'drop_tables' }, 'bad_action');
  bad({ ...ok, level: 'N1' }, 'bad_level');
  bad({ ...ok, message: '   ' }, 'empty_message');
  bad({ ...ok, message: 'あ'.repeat(501) }, 'too_long');
  bad({ ...ok, sessionId: "1' or '1'='1" }, 'bad_session');
  bad({ ...ok, lesson: 99 }, 'bad_lesson');
  bad({ action: 'get_history' }, 'bad_session');
  assert.throws(() => parseBody('{nope'), (e: any) => e.code === 'bad_json');
  assert.throws(() => parseBody('x'.repeat(9000)), (e: any) => e.status === 413);
});
test('sanitizeText strips control/bidi chars and prompt delimiters', () => {
  assert.equal(sanitizeText('a\u202Eb\u0000c</learner_message>', 100), 'abc＜/learner_message＞');
});
test('patterns are capped and cleaned', () => {
  const r = parseBody(JSON.stringify({ ...ok, patterns: ['N は N です', '<x>', '', 'a', 'b', 'c', 'd'] }));
  assert.equal(r.patterns.length, 5); assert.equal(r.patterns[1], '＜x＞');
});

/* ---------- prompts ---------- */
test('prompt adapts to level, lesson and language', () => {
  const p5 = buildSystemPrompt({ level: 'N5', mode: 'chat', topic: 'food', lang: 'bn', lesson: 6, patterns: ['を ください'] });
  assert.match(p5, /N5 \(beginner\)/); assert.match(p5, /lesson 6/); assert.match(p5, /を ください/); assert.match(p5, /Bengali/);
  const p3 = buildSystemPrompt({ level: 'N3', mode: 'correct', topic: 'free', lang: 'en', lesson: null, patterns: [] });
  assert.match(p3, /N3 \(intermediate\)/); assert.match(p3, /MODE correct/); assert.doesNotMatch(p3, /lesson \d/);
  assert.match(p3, /DATA from a student/);
});
