/**
 * Unified Input Validation & Hardened DOM Sanitizer for JP-Club
 */
(function (global) {
  'use strict';

  const ALLOWED_TAGS = new Set([
    'RUBY', 'RT', 'RP', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'BR',
    'P', 'DIV', 'UL', 'OL', 'LI', 'CODE', 'PRE', 'BLOCKQUOTE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'A', 'SUP', 'SUB'
  ]);

  const ALLOWED_ATTRS = new Set([
    'class', 'id', 'lang', 'dir', 'title', 'role',
    'aria-label', 'aria-hidden', 'aria-live', 'aria-expanded',
    'data-reading', 'data-romaji', 'data-lesson', 'data-id', 'data-tab', 'data-lang',
    'href', 'target', 'rel'
  ]);

  const SAFE_URL_RE = /^(?:https?:\/\/|mailto:|\/|\.\/|\.\.\/|#)/i;
  const CONTROL_BIDI_RE = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  }

  function text(val, maxLen = 200) {
    if (val == null) return '';
    const cleaned = String(val)
      .normalize('NFC')
      .replace(CONTROL_BIDI_RE, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.slice(0, maxLen);
  }

  function email(val) {
    const cleaned = text(val, 255).toLowerCase();
    if (!cleaned || cleaned.length > 254) return '';
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(cleaned)) {
      return '';
    }
    return cleaned;
  }

  function displayName(val) {
    const cleaned = text(val, 100);
    if (!cleaned || cleaned.length > 40) return '';
    if (!/^[\p{L}\p{M}\p{N} .'\-]+$/u.test(cleaned)) return '';
    return cleaned;
  }

  function passwordIssue(pw) {
    const s = String(pw ?? '');
    if (!s.trim()) return 'blank';
    if (s.length < 8) return 'short';
    if (s.length > 72) return 'long';
    if (/^(.)\1+$/.test(s)) return 'repeat';
    return null;
  }

  function birthDate(val, minAge = 5) {
    const s = text(val, 20);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return '';
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return '';

    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() !== month - 1 ||
      dt.getUTCDate() !== day
    ) {
      return '';
    }

    const now = new Date();
    if (dt.getTime() > now.getTime()) return '';

    let age = now.getUTCFullYear() - year;
    const mDiff = now.getUTCMonth() + 1 - month;
    if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < day)) {
      age--;
    }
    if (age < minAge) return '';
    return s;
  }

  function safeNext(raw, fallback = 'home.html') {
    if (raw == null) return fallback;
    const s = String(raw).trim();
    if (!s || s.length > 200) return fallback;
    if (/[\u0000-\u001F\u007F\\<>@]/.test(s)) return fallback;
    if (s.startsWith('/') || s.startsWith('.') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) {
      return fallback;
    }
    try {
      const decoded = decodeURIComponent(s);
      if (decoded.startsWith('//') || decoded.startsWith('/') || decoded.includes('\\') || /<|>/.test(decoded)) {
        return fallback;
      }
    } catch (_) {
      return fallback;
    }
    if (!/^[a-zA-Z0-9_-]+\.html(?:[?#][a-zA-Z0-9_=&%./:+#-]*)?$/.test(s)) {
      return fallback;
    }
    return s;
  }

  function oneOf(val, allowed, fallback) {
    return Array.isArray(allowed) && allowed.includes(val) ? val : fallback;
  }

  function sanitizeHtml(dirty) {
    if (dirty == null) return '';
    const input = String(dirty);
    if (typeof document === 'undefined') {
      return escapeHtml(input);
    }

    const template = document.createElement('template');
    template.innerHTML = input;

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null);
    const nodesToRemove = [];

    while (walker.nextNode()) {
      const el = walker.currentNode;
      const tag = el.tagName.toUpperCase();

      if (!ALLOWED_TAGS.has(tag)) {
        nodesToRemove.push({
          el,
          unwrap: tag !== 'SCRIPT' && tag !== 'STYLE' && tag !== 'IFRAME' && tag !== 'OBJECT' && tag !== 'EMBED' && tag !== 'SVG'
        });
        continue;
      }

      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '');

        if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (name === 'href') {
          if (!SAFE_URL_RE.test(val)) {
            el.removeAttribute('href');
          } else if (/^https?:\/\//i.test(val)) {
            el.setAttribute('rel', 'noopener noreferrer');
          }
        }
      }
    }

    for (const item of nodesToRemove) {
      if (item.unwrap) {
        const textNode = document.createTextNode(item.el.textContent || '');
        item.el.replaceWith(textNode);
      } else {
        item.el.remove();
      }
    }

    return template.innerHTML;
  }

  function setSafeHTML(el, html) {
    if (!el) return;
    el.innerHTML = sanitizeHtml(html);
  }

  const API = {
    escapeHtml,
    text,
    email,
    displayName,
    passwordIssue,
    birthDate,
    safeNext,
    oneOf,
    sanitizeHtml,
    sanitizeHTML: sanitizeHtml,
    setSafeHTML
  };

  global.JPSanitize = API;
  global.sanitizeHtml = sanitizeHtml;
  global.sanitizeHTML = sanitizeHtml;
  global.escapeHtml = escapeHtml;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
