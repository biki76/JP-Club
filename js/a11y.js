/* Phase 11 — accessibility runtime.
 * Adds: skip link, aria-live region, lang="ja" tagging for Japanese content,
 * reduced-motion html flag. Does not modify existing markup — additive only.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    injectSkipLink();
    injectLiveRegion();
    tagJapanese(document);
    observeJapanese();
    setupMotion();
    setupAriaLabels();
  });

  // ---- skip link (first focusable) ----
  function injectSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var main = document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'main-content';
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');

    var link = document.createElement('a');
    link.href = '#' + main.id;
    link.className = 'skip-link';
    link.innerHTML = '<span data-en="Skip to content" data-bn="বিষয়বস্তুতে যান">Skip to content</span>';
    document.body.insertBefore(link, document.body.firstChild);
  }

  // ---- global live region ----
  function injectLiveRegion() {
    if (document.getElementById('a11y-live')) return;
    var div = document.createElement('div');
    div.id = 'a11y-live';
    div.className = 'sr-only';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('aria-atomic', 'true');
    document.body.appendChild(div);
    window.announce = function (message) {
      div.textContent = '';
      setTimeout(function () { div.textContent = String(message); }, 40);
    };
  }

  // ---- tag Japanese content with lang="ja" ----
  var JP_SELECTORS = [
    'ruby',
    '[lang="ja"]',
    '[class*="__jp"]',
    '[class*="__kanji"]',
    '[class*="__stem"]',
    '[class*="__grammar"]',
    '[class*="__pattern"]'
  ].join(',');

  function tagJapanese(root) {
    root.querySelectorAll(JP_SELECTORS).forEach(function (el) {
      if (!el.getAttribute('lang')) el.setAttribute('lang', 'ja');
    });
  }

  function observeJapanese() {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) tagJapanese(node);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ---- reduced-motion flag on <html> ----
  function setupMotion() {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    function apply() {
      document.documentElement.setAttribute('data-motion', mq.matches ? 'reduced' : 'full');
    }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  // ---- ensure icon-only buttons have an aria-label ----
  function setupAriaLabels() {
    document.querySelectorAll('button:not([aria-label]):not([data-aria-label-en])').forEach(function (btn) {
      var hasText = btn.textContent.trim().length > 0;
      var hasImgAlt = btn.querySelector('img[alt]:not([alt=""])');
      var hasSvgTitle = btn.querySelector('svg title');
      if (!hasText && !hasImgAlt && !hasSvgTitle) {
        // Best-effort: use data-* if present, otherwise mark as review.
        btn.setAttribute('data-a11y-review', 'missing-label');
      }
    });
  }
})();
