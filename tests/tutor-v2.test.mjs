import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'js', 'tutor-voice.js'), 'utf8');

function loadPure() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.TutorVoicePure;
}

const P = loadPure();

test('opener post-check replaces きょうは', () => {
  const out = P.applyOpenerPostCheck('きょうはいい天気ですね。', true);
  assert.equal(out, 'こんにちは、いい天気ですね。');
});

test('opener is fixed when there are no prior turns', () => {
  const out = P.applyOpenerPostCheck('anything from the model', false);
  assert.equal(out, P.FIXED_OPENER);
  assert.equal(
    out,
    'こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。'
  );
});

test('non-ムーン self-introduction is corrected', () => {
  const out = P.correctSelfIntro('わたしはルナです。よろしく。');
  assert.match(out, /わたしはムーンです/);
  assert.doesNotMatch(out, /ルナ/);
});

test('a ムーン self-introduction is left alone', () => {
  const out = P.correctSelfIntro('わたしはムーンです。よろしく。');
  assert.equal(out, 'わたしはムーンです。よろしく。');
});

test('name input produces an acknowledgement, not an echo', () => {
  const ack = P.nameAcknowledgement('ビキ');
  assert.equal(
    ack,
    'はじめまして、ビキさん。よろしくお願いします。'
  );
  assert.doesNotMatch(ack, /わたしはビキ/);
  assert.doesNotMatch(ack, /ムーン/);
});

test('prepareForSpeech expands ムーン and keeps filler sounds', () => {
  const input = 'ムーンです。えーと、そうですね。';
  const out = P.prepareForSpeech(input);
  assert.equal(out, input);
  assert.match(out, /ムーン/);
  assert.match(out, /えーと/);
  assert.match(out, /そうですね/);
});

test('prepareForSpeech collapses repeated 。', () => {
  const out = P.prepareForSpeech('はい。。。そうです。');
  assert.equal(out, 'はい。そうです。');
});

test('prepareForSpeech normalises Moon to ムーン', () => {
  const out = P.prepareForSpeech('Moon です。');
  assert.match(out, /ムーン/);
  assert.doesNotMatch(out, /Moon/);
});

test('interruption path returns a short acknowledgement', () => {
  const out = P.interruptionReply();
  assert.ok(out.length <= 30);
  assert.match(out, /どうぞ/);
});

test('candidate parser handles valid JSON', () => {
  const raw = JSON.stringify([
    {
      jp: 'おはよう。',
      furigana: 'おはよう。',
      en: 'Morning.',
      bn: 'সুপ্রভাত।',
    },
  ]);
  const out = P.parseCandidates(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].jp, 'おはよう。');
  assert.equal(out[0].en, 'Morning.');
});

test('candidate parser handles fenced JSON', () => {
  const body = JSON.stringify([
    {
      jp: 'こんにちは。',
      furigana: 'こんにちは。',
      en: 'Hello.',
      bn: 'হ্যালো।',
    },
    {
      jp: 'お元気ですか。',
      furigana: 'おげんきですか。',
      en: 'How are you?',
      bn: 'আপনি কেমন আছেন?',
    },
    {
      jp: 'いい天気ですね。',
      furigana: 'いいてんきですね。',
      en: 'Nice weather.',
      bn: 'সুন্দর আবহাওয়া।',
    },
  ]);
  const raw = '```json\n' + body + '\n```';
  const out = P.parseCandidates(raw);
  assert.equal(out.length, 3);
  assert.equal(out[0].jp, 'こんにちは。');
  assert.equal(out[2].jp, 'いい天気ですね。');
});

test('candidate parser falls back safely on invalid JSON', () => {
  const out = P.parseCandidates('not json at all');
  assert.ok(Array.isArray(out));
  assert.ok(out.length >= 1);
  assert.ok(typeof out[0].jp === 'string');
  assert.ok(out[0].jp.length > 0);
});
