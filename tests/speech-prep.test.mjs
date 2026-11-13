import test from 'node:test';
import assert from 'node:assert/strict';

function fixOpening(text) {
  return String(text).replace(/^\s*きょうは[、,\s]*/, 'こんにちは、');
}

function extractName(text) {
  const s = String(text || '');
  let m = s.match(/(?:わたしは|私は|ぼくは|僕は)\s*([^\s、。です]+)\s*です/);
  if (m) return m[1];
  m = s.match(/^([^\s、。です]+)\s*です[。]?$/);
  if (m) return m[1];
  return '';
}

function flagNameEcho(reply, learnerName) {
  if (!learnerName || learnerName === 'ムーン') return false;
  const n = learnerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const s = String(reply || '');
  if (new RegExp('(?:わたしは|私は|ぼくは|僕は)\\s*' + n + '\\s*です').test(s)) return true;
  if (new RegExp('^\\s*' + n + '\\s*です[。]?').test(s)) return true;
  return false;
}

function prepareForSpeech(text) {
  let s = String(text);
  s = s.replace(/ムーン/g, 'ムーオン');
  s = s.replace(/。{2,}/g, '。');
  s = s.replace(/\s+([、。！？!?])/g, '$1');
  return s;
}

function filterCandidates(cands, learnerText) {
  const name = extractName(learnerText);
  return cands.filter((c) => !flagNameEcho(c.jp, name));
}

test('post-check replaces a reply starting with きょうは with こんにちは、', () => {
  const input = 'きょうはいい天気ですね。';
  const out = fixOpening(input);
  assert.equal(out, 'こんにちは、いい天気ですね。');
});

test('post-check leaves replies that do not start with きょうは unchanged', () => {
  const input = 'こんにちは。きょうはいい天気ですね。';
  assert.equal(fixOpening(input), input);
});

test('post-check flags a reply where Moon introduces itself with a non-ムーン name', () => {
  assert.equal(flagNameEcho('わたしはビキです。よろしくお願いします。', 'ビキ'), true);
  assert.equal(flagNameEcho('ビキです。よろしくお願いします。', 'ビキ'), true);
});

test('post-check does not flag a proper acknowledgement of the learner name', () => {
  assert.equal(flagNameEcho('はじめまして、ビキさん。よろしくお願いします。', 'ビキ'), false);
});

test('name input produces an acknowledgement, not an echo, in the candidate filter', () => {
  const learnerText = 'わたしはビキです';
  const candidates = [
    { jp: 'わたしはビキです。よろしくお願いします。' },
    { jp: 'はじめまして、ビキさん。よろしくお願いします。' },
    { jp: 'ビキです。よろしくお願いします。' },
  ];
  const kept = filterCandidates(candidates, learnerText);
  assert.deepEqual(kept.map((c) => c.jp), ['はじめまして、ビキさん。よろしくお願いします。']);
});

test('prepareForSpeech converts ムーン to the chosen TTS reading ムーオン', () => {
  const out = prepareForSpeech('こんにちは、ムーンです。');
  assert.ok(out.includes('ムーオン'), 'expected ムーオン in output');
  assert.ok(!out.includes('ムーン'), 'raw ムーン should not remain');
});

test('prepareForSpeech keeps filler and feeling sounds', () => {
  const input = 'えーと、あの、えっと、ああ、うーん、ええ、そうですね、まあ。';
  const out = prepareForSpeech(input);
  for (const filler of ['えーと', 'あの', 'えっと', 'ああ', 'うーん', 'ええ', 'そうですね', 'まあ']) {
    assert.ok(out.includes(filler), `filler ${filler} was removed`);
  }
});

test('prepareForSpeech does not mutate the input string', () => {
  const input = 'ムーンです。えーと、そうですね。';
  const snapshot = input;
  prepareForSpeech(input);
  assert.equal(input, snapshot);
});

test('prepareForSpeech collapses repeated 。 and removes stray spaces before punctuation', () => {
  assert.equal(prepareForSpeech('です。。。'), 'です。');
  assert.equal(prepareForSpeech('です 。'), 'です。');
  assert.equal(prepareForSpeech('です 、 ね'), 'です、 ね');
});
