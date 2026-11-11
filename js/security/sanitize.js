/* js/security/sanitize.js — input hygiene helpers (no dependencies).
 * Exposes window.Sanitize. Client-side checks are UX + defence in depth;
 * the server (RLS + edge functions) is the real authority.
 */
(function (root) {
  'use strict';

  var CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"'`]/g, function (c) { return ESC[c]; });
  }

  /* Free text: NFC, strip control + bidi-override chars, trim, cap length. */
  function text(s, max) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFC'); } catch (e) {}
    s = s.replace(CTRL, '').trim();
    var cap = max > 0 ? max : 500;
    return s.length > cap ? s.slice(0, cap) : s;
  }

  /* Returns a normalised address or '' when invalid. */
  function email(s) {
    s = text(s, 254).toLowerCase();
    return /^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$/.test(s) ? s : '';
  }

  /* Letters / marks / digits / space . ' - _ (Bengali + Japanese safe). */
  function displayName(s) {
    s = text(s, 200).replace(/\s+/g, ' ');
    if (s.length < 1 || s.length > 40) return '';
    try { return /^[\p{L}\p{M}\p{N} .'_\-]+$/u.test(s) ? s : ''; }
    catch (e) { return /^[^<>&"`\\\/]+$/.test(s) ? s : ''; }
  }

  /* Returns an error key or null. bcrypt truncates at 72 bytes, so cap it. */
  function passwordIssue(pw) {
    pw = String(pw == null ? '' : pw);
    if (pw.length < 8) return 'short';
    if (pw.length > 72) return 'long';
    if (!pw.trim()) return 'blank';
    if (/^(.)\1+$/.test(pw)) return 'repeat';
    return null;
  }

  function oneOf(v, list, fallback) {
    return list.indexOf(v) > -1 ? v : (fallback === undefined ? '' : fallback);
  }

  /* ISO date between 1900-01-01 and (today - minAge years). '' when invalid. */
  function birthDate(s, minAge) {
    s = text(s, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    var d = new Date(s + 'T00:00:00Z');
    if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return '';
    var max = new Date(); max.setUTCFullYear(max.getUTCFullYear() - (minAge || 0));
    return d >= new Date('1900-01-01T00:00:00Z') && d <= max ? s : '';
  }

  /* Open-redirect guard: only same-folder *.html pages, optional ?query / #hash. */
  var NEXT_OK = /^[a-z0-9][a-z0-9_\-]*\.html(\?[A-Za-z0-9_=&%.\-]{0,200})?(#[A-Za-z0-9_\-]{0,60})?$/i;
  function safeNext(raw, fallback) {
    fallback = fallback || 'home.html';
    raw = String(raw == null ? '' : raw).trim();
    return NEXT_OK.test(raw) ? raw : fallback;
  }

  /* Resolve a page name against the *current folder* — works on a GitHub
   * Pages project site (/JP-Club/…) where a leading "/" would be wrong. */
  function appUrl(rel) {
    return new URL(String(rel), root.location.href).href;
  }

  root.Sanitize = {
    escapeHtml: escapeHtml, text: text, email: email, displayName: displayName,
    passwordIssue: passwordIssue, oneOf: oneOf, birthDate: birthDate,
    safeNext: safeNext, appUrl: appUrl
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Sanitize;
})(typeof window !== 'undefined' ? window : globalThis);
