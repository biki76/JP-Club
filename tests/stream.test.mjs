// Run: node --test tests/stream.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../js/ai-tutor/stream.js');
const { send } = window.AITutorStream;

const enc = new TextEncoder();
const frame = (ev, d) => `event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`;
function sseResponse(frames, { dropAfter = -1 } = {}) {
  let i = 0;
  return new Response(new ReadableStream({
    pull(c) {
      if (dropAfter >= 0 && i === dropAfter) { c.error(new TypeError('network error')); return; }
      if (i >= frames.length) { c.close(); return; }
      c.enqueue(enc.encode(frames[i++]));
    },
  }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
const OK = [frame('meta', { sessionId: 's1' }), frame('delta', { t: 'は' }), frame('delta', { t: 'い' }), frame('done', { reply: 'はい', sessionId: 's1' })];
const base = (extra = {}) => {
  const log = { deltas: [], done: null, meta: null, attempts: [] };
  return {
    log,
    opts: {
      url: 'https://x/f', getToken: async (force) => (force ? 'fresh' : 'old'), apikey: 'k', body: { message: 'm' },
      onMeta: (m) => { log.meta = m; }, onDelta: (t) => log.deltas.push(t), onDone: (d) => { log.done = d; },
      onAttempt: (n) => log.attempts.push(n), ...extra,
    },
  };
};
const realFetch = globalThis.fetch;

test('streams meta, deltas and done', async () => {
  globalThis.fetch = async () => sseResponse(OK);
  const { opts, log } = base();
  await send(opts).done;
  assert.deepEqual(log.deltas, ['は', 'い']); assert.equal(log.done.reply, 'はい'); assert.equal(log.meta.sessionId, 's1');
});

test('frames split at arbitrary byte boundaries still parse', async () => {
  const all = OK.join('');
  const parts = []; for (let i = 0; i < all.length; i += 7) parts.push(all.slice(i, i + 7));
  globalThis.fetch = async () => sseResponse(parts);
  const { opts, log } = base();
  await send(opts).done;
  assert.deepEqual(log.deltas, ['は', 'い']);
});

test('network failure before any token → automatic retry succeeds', async () => {
  let n = 0;
  globalThis.fetch = async () => { if (n++ === 0) throw new TypeError('fetch failed'); return sseResponse(OK); };
  const { opts, log } = base();
  await send(opts).done;
  assert.equal(n, 2); assert.deepEqual(log.attempts, [1]); assert.equal(log.done.reply, 'はい');
});

test('gives up after two automatic retries', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; throw new TypeError('fetch failed'); };
  const { opts } = base();
  await assert.rejects(send(opts).done, (e) => e.code === 'network' && e.retryable);
  assert.equal(n, 3);
});

test('drop AFTER tokens were shown → no auto-retry, error flagged partial', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; return sseResponse(OK, { dropAfter: 2 }); };
  const { opts, log } = base();
  await assert.rejects(send(opts).done, (e) => e.code === 'stream_interrupted' && e.partial === true);
  assert.equal(n, 1); assert.deepEqual(log.deltas, ['は']);
});

test('stream that ends without a done event is treated as interrupted', async () => {
  globalThis.fetch = async () => sseResponse([frame('meta', {}), frame('delta', { t: 'は' })]);
  const { opts } = base();
  await assert.rejects(send(opts).done, (e) => e.code === 'stream_interrupted');
});

test('401 → refreshes the token once and retries', async () => {
  const seen = [];
  globalThis.fetch = async (_u, init) => {
    seen.push(init.headers.Authorization);
    return seen.length === 1 ? new Response('{}', { status: 401 }) : sseResponse(OK);
  };
  const { opts, log } = base();
  await send(opts).done;
  assert.deepEqual(seen, ['Bearer old', 'Bearer fresh']); assert.equal(log.done.reply, 'はい');
});

test('429 is surfaced immediately (no hammering), with server code', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; return new Response(JSON.stringify({ code: 'rate_limited', message: 'slow' }), { status: 429, headers: { 'content-type': 'application/json' } }); };
  const { opts } = base();
  await assert.rejects(send(opts).done, (e) => e.code === 'rate_limited' && e.status === 429);
  assert.equal(n, 1);
});

test('server error event before tokens → retried automatically, then surfaced', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; return sseResponse([frame('meta', {}), frame('error', { code: 'ai_unavailable', message: 'busy', retryable: true })]); };
  const { opts } = base();
  await assert.rejects(send(opts).done, (e) => e.code === 'ai_unavailable');
  assert.equal(n, 3);
});

test('cancel() rejects with code "cancelled" and does not retry', async () => {
  let n = 0;
  globalThis.fetch = (_u, init) => { n++; return new Promise((_r, rej) => init.signal.addEventListener('abort', () => rej(new DOMException('x', 'AbortError')))); };
  const { opts } = base();
  const h = send(opts);
  setTimeout(() => h.cancel(), 20);
  await assert.rejects(h.done, (e) => e.code === 'cancelled');
  assert.equal(n, 1);
});

test('JSON fallback response is accepted', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { reply: 'はい' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  const { opts, log } = base();
  await send(opts).done;
  assert.equal(log.done.reply, 'はい');
});

test.after(() => { globalThis.fetch = realFetch; });
