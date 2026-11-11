/**
 * Hardened DOM Sanitizer for JP-Club (Furigana <ruby>/<rt> + AI Tutor Markdown safe)
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

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
        nodesToRemove.push({ el, unwrap: tag !== 'SCRIPT' && tag !== 'STYLE' && tag !== 'IFRAME' && tag !== 'OBJECT' && tag !== 'EMBED' && tag !== 'SVG' });
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
        const text = document.createTextNode(item.el.textContent || '');
        item.el.replaceWith(text);
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

  const API = { sanitizeHtml, sanitizeHTML: sanitizeHtml, escapeHtml, setSafeHTML };
  global.JPSanitize = API;
  global.sanitizeHtml = sanitizeHtml;
  global.sanitizeHTML = sanitizeHtml;
  global.escapeHtml = escapeHtml;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
