/* ==========================================================
   Moon Moon (Slimo) mascot — home.html
   - injects itself next to the "Today's phrase" card
   - states: idle, confused, happy, sad, sleepy, love, surprised, wink
   - hover → happy · click → next mood + squish · 30s idle → sleepy
   - adds shimmer class to the main CTA
   API: Slimo.set('happy') · Slimo.react('love', 2000)
   ========================================================== */
(function () {
  'use strict';

  var IDLE_MS = 30000;
  var CYCLE = ['idle', 'confused', 'happy', 'sad', 'sleepy', 'love', 'surprised', 'wink'];

  var SAY = {
    idle:      ['Hi! I’m Moon Moon 👋',          'হাই! আমি মুন মুন 👋'],
    confused:  ['Hmm… what does that mean?',     'হুম… এর মানে কী?'],
    happy:     ['Yay! Keep going!',              'ইয়ে! চালিয়ে যাও!'],
    sad:       ['I miss studying with you…',     'তোমার সাথে পড়তে মিস করছি…'],
    sleepy:    ['Zzz… wake me up!',              'Zzz… আমাকে জাগাও!'],
    love:      ['I love Japanese!',              'আমি জাপানি ভাষা ভালোবাসি!'],
    surprised: ['Whoa!',                         'ওয়াও!'],
    wink:      ['You’ve got this! ✨',            'তুমি পারবে! ✨']
  };

  function lang() {
    try { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
    catch (e) { return 'en'; }
  }

  /* ---------------- SVG ---------------- */
  var EYE_L = 78, EYE_R = 122;
  var SVG = [
    '<svg class="slimo__svg" viewBox="0 0 200 180" aria-hidden="true" focusable="false">',
    '<ellipse class="s-shadow" cx="100" cy="166" rx="82" ry="8"/>',
    '<g class="slimo__body">',
      /* sprout */
      '<path class="s-stem" d="M100 46 C100 36 97 31 100 24"/>',
      '<ellipse class="s-body" cx="100" cy="15" rx="11" ry="13"/>',
      '<ellipse class="s-hi" cx="96" cy="9" rx="4" ry="3" transform="rotate(-25 96 9)"/>',
      /* body */
      '<path class="s-body" d="M28 140 C28 112 54 96 62 72 C70 48 88 40 100 40 C112 40 130 48 138 72 C146 96 172 112 172 140 C172 153 150 158 100 158 C50 158 28 153 28 140Z"/>',
      '<path class="s-dark" d="M28 140 C28 153 50 158 100 158 C150 158 172 153 172 140 C172 147 150 149 100 149 C50 149 28 147 28 140Z"/>',
      '<ellipse class="s-hi" cx="70" cy="80" rx="9" ry="5" transform="rotate(-35 70 80)"/>',
      '<circle class="s-hi" cx="58" cy="94" r="2.5"/>',
      '<ellipse class="s-blush" cx="62" cy="118" rx="9" ry="5.5"/>',
      '<ellipse class="s-blush" cx="138" cy="118" rx="9" ry="5.5"/>',

      /* idle */
      '<g class="f f--idle">',
        '<g class="eyes">',
          '<ellipse class="s-ink" cx="78" cy="100" rx="7" ry="10"/>',
          '<ellipse class="s-ink" cx="122" cy="100" rx="7" ry="10"/>',
          '<circle class="s-white" cx="75.5" cy="95.5" r="2.8"/>',
          '<circle class="s-white" cx="119.5" cy="95.5" r="2.8"/>',
        '</g>',
        '<path class="s-ink" d="M94 113 Q100 111 106 113 Q106 125 100 125 Q94 125 94 113Z"/>',
        '<ellipse class="s-tongue" cx="100" cy="121" rx="3.6" ry="2.6"/>',
      '</g>',

      /* confused (face) */
      '<g class="f f--confused">',
        '<ellipse class="s-ink" cx="80" cy="102" rx="6" ry="9"/>',
        '<ellipse class="s-ink" cx="122" cy="98" rx="6" ry="9"/>',
        '<circle class="s-white" cx="78" cy="98" r="2.4"/>',
        '<circle class="s-white" cx="120" cy="94" r="2.4"/>',
        '<path class="s-line" style="stroke-width:3" d="M92 120 Q96 115 100 119 T108 117"/>',
      '</g>',

      /* happy */
      '<g class="f f--happy">',
        '<path class="s-line" d="M70 91 L85 100 L70 109"/>',
        '<path class="s-line" d="M130 91 L115 100 L130 109"/>',
        '<path class="s-ink" d="M91 112 Q100 109 109 112 Q109 130 100 130 Q91 130 91 112Z"/>',
        '<ellipse class="s-tongue" cx="100" cy="124" rx="5" ry="3.5"/>',
      '</g>',

      /* sad */
      '<g class="f f--sad">',
        '<path class="s-line" style="stroke-width:3" d="M68 93 L86 87"/>',
        '<path class="s-line" style="stroke-width:3" d="M132 93 L114 87"/>',
        '<ellipse class="s-ink" cx="78" cy="102" rx="7" ry="8" transform="rotate(-12 78 102)"/>',
        '<ellipse class="s-ink" cx="122" cy="102" rx="7" ry="8" transform="rotate(12 122 102)"/>',
        '<circle class="s-white" cx="76" cy="99" r="2.4"/>',
        '<circle class="s-white" cx="120" cy="99" r="2.4"/>',
        '<path class="s-line" style="stroke-width:3" d="M93 123 Q100 116 107 123"/>',
        '<path class="s-tear tear" d="M86 112 Q82 119 86 122 Q90 119 86 112Z"/>',
      '</g>',

      /* sleepy (face) */
      '<g class="f f--sleepy">',
        '<path class="s-line" d="M69 102 L87 102"/>',
        '<path class="s-line" d="M113 102 L131 102"/>',
        '<ellipse class="s-ink" cx="100" cy="117" rx="2.6" ry="3.6"/>',
      '</g>',

      /* love */
      '<g class="f f--love">',
        '<path class="s-heart heart" d="M0 7 C-11 -2 -7 -11 0 -5 C7 -11 11 -2 0 7Z" transform="translate(78 100) scale(1.2)"/>',
        '<path class="s-heart heart" d="M0 7 C-11 -2 -7 -11 0 -5 C7 -11 11 -2 0 7Z" transform="translate(122 100) scale(1.2)"/>',
        '<path class="s-ink" d="M92 112 Q100 110 108 112 Q106 125 100 125 Q94 125 92 112Z"/>',
        '<ellipse class="s-tongue" cx="100" cy="120" rx="4" ry="2.8"/>',
      '</g>',

      /* surprised */
      '<g class="f f--surprised">',
        '<circle class="s-ink" cx="78" cy="100" r="9.5"/>',
        '<circle class="s-ink" cx="122" cy="100" r="9.5"/>',
        '<circle class="s-white" cx="74.5" cy="96" r="3.2"/>',
        '<circle class="s-white" cx="118.5" cy="96" r="3.2"/>',
        '<ellipse class="s-ink" cx="100" cy="120" rx="5" ry="7"/>',
        '<ellipse class="s-tongue" cx="100" cy="123" rx="3" ry="3.5"/>',
      '</g>',

      /* wink */
      '<g class="f f--wink">',
        '<path class="s-line" d="M69 103 Q78 93 87 103"/>',
        '<ellipse class="s-ink" cx="122" cy="100" rx="7" ry="10"/>',
        '<circle class="s-white" cx="119.5" cy="95.5" r="2.8"/>',
        '<path class="s-line" style="stroke-width:3.5" d="M91 113 Q100 124 109 113"/>',
      '</g>',
    '</g>',

    /* confused "?" (outside body so it stays crisp) */
    '<g class="f f--confused"><g class="q">',
      '<text class="s-text" x="122" y="34" font-size="34">?</text>',
    '</g></g>',

    /* sleepy "Zzz" */
    '<g class="f f--sleepy">',
      '<text class="s-text z z1" x="124" y="40" font-size="14">Z</text>',
      '<text class="s-text z z2" x="136" y="28" font-size="18">Z</text>',
      '<text class="s-text z z3" x="150" y="12" font-size="24">Z</text>',
    '</g>',
    '</svg>'
  ].join('');

  /* ---------------- build + behaviour ---------------- */
  var wrap, btn, bubbleText;
  var base = 'idle', shown = 'idle', locked = false, asleepByIdle = false;
  var idleT, flashT, squishT, lastAct = 0;

  function build() {
    wrap = document.createElement('div');
    wrap.className = 'slimo-wrap';
    wrap.innerHTML =
      '<div class="slimo-bubble" aria-live="polite"><span></span></div>' +
      '<button type="button" class="slimo" data-state="idle" ' +
      'data-aria-label-en="Moon Moon mascot. Press to change mood." ' +
      'data-aria-label-bn="মুন মুন মাসকট। মুড বদলাতে চাপুন।">' + SVG + '</button>';
    btn = wrap.querySelector('.slimo');
    bubbleText = wrap.querySelector('.slimo-bubble span');
    refreshLang();

    btn.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || locked) return;
      show(base === 'sleepy' ? 'surprised' : 'happy');
    });
    btn.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      locked = false;
      show(base);
    });
    btn.addEventListener('click', function () {
      asleepByIdle = false;
      base = CYCLE[(CYCLE.indexOf(base) + 1) % CYCLE.length];
      locked = true;
      show(base);
      squish();
      resetIdle();
    });
  }

  function show(state) {
    shown = state;
    btn.setAttribute('data-state', state);
    var s = SAY[state];
    bubbleText.setAttribute('data-en', s[0]);
    bubbleText.setAttribute('data-bn', s[1]);
    bubbleText.textContent = s[lang() === 'bn' ? 1 : 0];
  }

  function refreshLang() {
    var l = lang();
    btn.setAttribute('aria-label', btn.getAttribute('data-aria-label-' + l));
    show(shown);
  }

  function squish() {
    btn.classList.remove('is-squish');
    void btn.offsetWidth; /* restart animation */
    btn.classList.add('is-squish');
    clearTimeout(squishT);
    squishT = setTimeout(function () { btn.classList.remove('is-squish'); }, 600);
  }

  /* idle → sleepy */
  function resetIdle() {
    clearTimeout(idleT);
    idleT = setTimeout(function () {
      if (base !== 'sleepy') { asleepByIdle = true; base = 'sleepy'; show('sleepy'); }
    }, IDLE_MS);
  }

  function onActivity() {
    var now = Date.now();
    if (!asleepByIdle && now - lastAct < 500) return; /* throttle */
    lastAct = now;
    resetIdle();
    if (asleepByIdle) {
      asleepByIdle = false;
      base = 'idle';
      show('surprised');
      clearTimeout(flashT);
      flashT = setTimeout(function () { show(base); }, 900);
    }
  }

  /* ---------------- public API ---------------- */
  window.Slimo = {
    set: function (s) {
      if (CYCLE.indexOf(s) < 0 || !btn) return;
      asleepByIdle = false; base = s; show(s); resetIdle();
    },
    react: function (s, ms) {
      if (CYCLE.indexOf(s) < 0 || !btn) return;
      clearTimeout(flashT);
      show(s); squish();
      flashT = setTimeout(function () { show(base); }, ms || 2000);
    }
  };

  /* ---------------- mounting ---------------- */
  function findLabel() {
    var nodes = document.querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) {
      if (/today['’]s phrase/i.test(nodes[i].getAttribute('data-en') || '')) return nodes[i];
    }
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      if (/today['’]s phrase|আজকের বাক্য/i.test(w.currentNode.nodeValue)) return w.currentNode.parentElement;
    }
    return null;
  }

  function findAnchor() {
    var marked = document.querySelector('[data-slimo-anchor]');
    if (marked) return marked;
    var label = findLabel();
    if (!label) return null;
    var el = label;
    while (el.parentElement) {
      var p = el.parentElement;
      if (p === document.body || p.tagName === 'MAIN' || p.querySelector('h1')) break;
      el = p;
    }
    if (el === label && label.parentElement && label.parentElement.tagName !== 'MAIN') el = label.parentElement;
    return el;
  }

  var mounted = false;
  function mount(anchor) {
    if (mounted) return;
    mounted = true;
    build();
    if (anchor && anchor.parentNode) {
      var row = document.createElement('div');
      row.className = 'slimo-row';
      anchor.parentNode.insertBefore(row, anchor);
      row.appendChild(anchor);
      row.appendChild(wrap);
    } else {
      wrap.classList.add('slimo-wrap--float');
      document.body.appendChild(wrap);
    }
    show('idle');
    ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, onActivity, { passive: true });
    });
    resetIdle();

    new MutationObserver(refreshLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('storage', function (e) { if (e.key === 'nihongo_lang') refreshLang(); });
  }

  function waitFor(find, found, timeoutMs, notFound) {
    var r = find();
    if (r) { found(r); return; }
    var mo = new MutationObserver(function () {
      var x = find();
      if (x) { mo.disconnect(); found(x); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); if (notFound) notFound(); }, timeoutMs);
  }

  function findCta() {
    var marked = document.querySelector('[data-shimmer]');
    if (marked) return marked;
    var els = document.querySelectorAll('a, button');
    for (var i = 0; i < els.length; i++) {
      var t = els[i].getAttribute('data-en') || els[i].textContent || '';
      if (/start lesson 1/i.test(t)) return els[i];
    }
    return null;
  }

  function init() {
    waitFor(findAnchor, mount, 6000, function () { mount(null); });
    waitFor(findCta, function (el) { el.classList.add('slimo-shimmer'); }, 6000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
