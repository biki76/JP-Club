// Run: node tests/run-ts.mjs   (or: npm test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TagStream, parseFix, parseTip } from '../../supabase/functions/ai-tutor/lib/parser.ts';

const SAMPLE =
  'REPLY: そうですか。いいですね。\nどこで べんきょうしましたか。\n' +
  'TR: তাই নাকি? ভালো। কোথায় পড়েছেন?\n' +
  'FIX: わたしは がくせい です => わたしは がくせいです | "です" আগে স্পেস লাগে না\n' +
  'TIP: もういちど おねがいします | আবার বলতে বলার সহজ উপায়';

function run(chunks: string[]) {
  const s = new TagStream();
  let streamed = '';
  for (const c of chunks) streamed += s.push(c);
  return { streamed, result: s.finish() };
}

test('streams only the REPLY section and parses the rest', () => {
  const { streamed, result } = run([SAMPLE]);
  assert.equal(streamed.trim(), 'そうですか。いいですね。\nどこで べんきょうしましたか。');
  assert.equal(result.reply, 'そうですか。いいですね。\nどこで べんきょうしましたか。');
  assert.match(result.translation, /কোথায়/);
  assert.equal(result.correction?.corrected, 'わたしは がくせいです');
  assert.equal(result.suggestion?.text, 'もういちど おねがいします');
});

test('identical output for any chunking (1-char, 3-char, random)', () => {
  const base = run([SAMPLE]);
  const chars = [...SAMPLE];
  const one = run(chars);
  assert.equal(one.streamed.trim(), base.streamed.trim());
  assert.deepEqual(one.result, base.result);

  for (let seed = 1; seed <= 40; seed++) {
    let x = seed * 9301 + 49297, i = 0; const parts: string[] = [];
    while (i < chars.length) { x = (x * 233280 + 12345) % 2147483647; const n = 1 + (x % 9); parts.push(chars.slice(i, i + n).join('')); i += n; }
    const r = run(parts);
    assert.equal(r.streamed.trim(), base.streamed.trim(), 'seed ' + seed);
    assert.deepEqual(r.result, base.result, 'seed ' + seed);
  }
});

test('never leaks a tag prefix into the stream', () => {
  const s = new TagStream(); let out = '';
  for (const c of ['REPLY: はい。', '\n', 'T', 'R', ': hello']) out += s.push(c);
  assert.equal(out.trim(), 'はい。');
  assert.equal(s.finish().translation, 'hello');
});

test('a colon-word inside the reply is not treated as a tag', () => {
  const { result } = run(['REPLY: ノート: これは ペンです。\nTR: ok']);
  assert.equal(result.reply, 'ノート: これは ペンです。');
});

test('FIX: none and TIP: none become null', () => {
  const { result } = run(['REPLY: はい。\nTR: yes\nFIX: none\nTIP: none']);
  assert.equal(result.correction, null);
  assert.equal(result.suggestion, null);
});

test('model that ignores the format is streamed as plain reply', () => {
  const text = 'こんにちは！きょうは いいてんきですね。どこへ いきますか。ともだちと あいますか。';
  const { streamed, result } = run([text.slice(0, 10), text.slice(10)]);
  assert.equal(streamed, text);
  assert.equal(result.reply, text);
});

test('very short untagged output is not streamed but finish() still returns it', () => {
  const { streamed, result } = run(['はい。']);
  assert.equal(streamed, '');
  assert.equal(result.reply, 'はい。');   // client replaces the bubble with done.reply
});

test('markdown noise is stripped', () => {
  const { streamed, result } = run(['REPLY: **はい**、`そうです`。\nTR: yes']);
  assert.equal(streamed.trim(), 'はい、そうです。');
  assert.equal(result.reply, 'はい、そうです。');
});

test('parseFix rejects no-op and malformed lines', () => {
  assert.equal(parseFix('a => a | same'), null);
  assert.equal(parseFix('no arrow here'), null);
  assert.equal(parseFix(''), null);
  assert.deepEqual(parseFix('x => y | because'), { original: 'x', corrected: 'y', explanation: 'because' });
});

test('parseTip', () => {
  assert.equal(parseTip('none'), null);
  assert.deepEqual(parseTip('phrase | why'), { text: 'phrase', explanation: 'why' });
});

test('output fields are length-capped', () => {
  const { result } = run(['REPLY: ' + 'あ'.repeat(5000)]);
  assert.ok(result.reply.length <= 700);
});
