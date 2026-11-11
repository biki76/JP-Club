// Run: node --test tests/sanitize.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const S = createRequire(import.meta.url)('../js/security/sanitize.js');

test('escapeHtml neutralises markup and quotes', () => {
  assert.equal(S.escapeHtml('<img src=x onerror="a()">&\'`'), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;&#96;');
});
test('text strips control/bidi chars, normalises and caps', () => {
  assert.equal(S.text('a\u202Eb\u0000c  ', 50), 'abc');
  assert.equal(S.text('あ'.repeat(600), 500).length, 500);
  assert.equal(S.text(null, 10), '');
});
test('email', () => {
  assert.equal(S.email('  Biki@Example.COM '), 'biki@example.com');
  for (const bad of ['', 'a@b', 'a b@c.com', '<x>@c.com', 'a@@c.com', 'x'.repeat(300) + '@c.com']) assert.equal(S.email(bad), '', bad);
});
test('displayName accepts Bengali/Japanese, rejects markup', () => {
  assert.equal(S.displayName('বিকি সেনসেই'), 'বিকি সেনসেই');
  assert.equal(S.displayName('ビキ先生'), 'ビキ先生');
  assert.equal(S.displayName("O'Brien-Lee"), "O'Brien-Lee");
  for (const bad of ['', '<script>', 'a'.repeat(41), 'x;drop', 'a/b']) assert.equal(S.displayName(bad), '', bad);
});
test('passwordIssue', () => {
  assert.equal(S.passwordIssue('short'), 'short');
  assert.equal(S.passwordIssue('x'.repeat(73)), 'long');
  assert.equal(S.passwordIssue('aaaaaaaaaa'), 'repeat');
  assert.equal(S.passwordIssue('        '), 'blank');
  assert.equal(S.passwordIssue('correct horse 7'), null);
});
test('birthDate validates calendar dates and minimum age', () => {
  assert.equal(S.birthDate('2000-02-29', 5), '2000-02-29');
  assert.equal(S.birthDate('2001-02-29', 5), '');
  assert.equal(S.birthDate('1899-12-31', 0), '');
  assert.equal(S.birthDate('2999-01-01', 0), '');
  const y = new Date().getUTCFullYear();
  assert.equal(S.birthDate(`${y}-01-01`, 5), '');
  assert.equal(S.birthDate('not a date', 5), '');
});
test('safeNext blocks open redirects', () => {
  assert.equal(S.safeNext('lesson.html?lesson=minna-001#top'), 'lesson.html?lesson=minna-001#top');
  for (const bad of ['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/etc/passwd', '..\\x.html', 'a.html\\@evil', 'http:evil.html', 'x.html?a=<script>', '', null, 'data:text/html,x', '%2f%2fevil.com'])
    assert.equal(S.safeNext(bad), 'home.html', String(bad));
});
test('oneOf', () => { assert.equal(S.oneOf('n5', ['n5', 'n4']), 'n5'); assert.equal(S.oneOf('x', ['n5'], 'd'), 'd'); });
