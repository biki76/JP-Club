/* ==========================================================
   Slimo mascot — home.html
   - injects itself next to the "Today's phrase" card
   - states: idle, confused, happy, sad, sleepy, love, surprised, wink
   - auto-changes mood every 5s · tap/click → next mood + squish · hover → happy
   - adds shimmer class to the main CTA
   API: Slimo.set('happy') · Slimo.react('love', 2000)
   ========================================================== */
(function () {
  'use strict';

  /* ---- CSS is embedded so a single file is enough (no separate slimo.css needed) ---- */
  if (!document.getElementById('slimo-style')) {
    var st = document.createElement('style');
    st.id = 'slimo-style';
    st.textContent = `/* ==========================================================
   Slimo mascot + CTA shimmer — additive, home.html
   ========================================================== */

.slimo-wrap {
  --slimo-body: #a96cf5;
  --slimo-dark: #8a55c9;
  --slimo-ink: #351a6b;
  --slimo-blush: #ffa8dd;
  --slimo-tongue: #6b3fb0;
  --slimo-shadow: rgba(53, 26, 107, 0.18);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  width: 124px;
}

/* ---------- layout row around "Today's phrase" ---------- */
.slimo-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}
.slimo-row > :first-child { flex: 1 1 0; min-width: 0; }

.slimo-wrap--float {
  position: fixed;
  right: 1rem;
  bottom: 5rem;
  width: 120px;
  z-index: 40;
}

@media (max-width: 640px) {
  .slimo-row { gap: 0.5rem; }
  .slimo-wrap { width: 92px; }
  .slimo-bubble { font-size: 0.7rem; padding: 0.3rem 0.5rem; width: max-content; max-width: 108px; }
}

/* ---------- speech bubble ---------- */
.slimo-bubble {
  position: relative;
  width: max-content;
  max-width: 150px;
  padding: 0.35rem 0.65rem;
  border-radius: 0.9rem;
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: center;
  background: var(--surface, Canvas);
  color: var(--text, CanvasText);
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}
.slimo-bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 10px;
  height: 10px;
  background: inherit;
  border-right: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-bottom: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  transform: translateX(-50%) rotate(45deg);
}

/* ---------- character button ---------- */
.slimo {
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  border-radius: 1rem;
}
.slimo:focus-visible { outline: 2px solid var(--focus, currentColor); outline-offset: 2px; }
.slimo__svg { display: block; width: 100%; height: auto; overflow: visible; }

/* ---------- SVG paint classes ---------- */
.s-shadow { fill: var(--slimo-shadow); }
.s-body   { fill: var(--slimo-body); }
.s-dark   { fill: var(--slimo-dark); }
.s-stem   { stroke: var(--slimo-body); stroke-width: 6; stroke-linecap: round; fill: none; }
.s-hi     { fill: #fff; opacity: 0.5; }
.s-white  { fill: #fff; }
.s-blush  { fill: var(--slimo-blush); }
.s-ink    { fill: var(--slimo-ink); }
.s-tongue { fill: var(--slimo-tongue); }
.s-heart  { fill: #ff5fa2; }
.s-tear   { fill: #8fd3ff; }
.s-line   { fill: none; stroke: var(--slimo-ink); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
.s-text   { fill: var(--slimo-body); font: 800 20px "Inter", system-ui, sans-serif; }

/* ---------- state visibility ---------- */
.slimo .f { display: none; }
.slimo[data-state="idle"]      .f--idle,
.slimo[data-state="confused"]  .f--confused,
.slimo[data-state="happy"]     .f--happy,
.slimo[data-state="sad"]       .f--sad,
.slimo[data-state="sleepy"]    .f--sleepy,
.slimo[data-state="love"]      .f--love,
.slimo[data-state="surprised"] .f--surprised,
.slimo[data-state="wink"]      .f--wink { display: inline; }

/* ---------- animations ---------- */
.slimo__body,
.slimo__svg .s-shadow { transform-box: fill-box; transform-origin: 50% 100%; }

.slimo__body { animation: slimo-breathe 3.2s ease-in-out infinite; }
.slimo[data-state="sleepy"] .slimo__body { animation-duration: 6.5s; }
.slimo[data-state="happy"]  .slimo__body { animation: slimo-wiggle 0.55s ease-in-out infinite; }
.slimo[data-state="love"]   .slimo__body { animation-duration: 1.6s; }
.slimo[data-state="surprised"] .slimo__body { animation: slimo-jump 0.5s ease-out 1; }
.slimo[data-state="sad"]    .slimo__body { animation-duration: 5s; }
.slimo.is-squish .slimo__body { animation: slimo-squish 0.55s ease-out 1; }

.slimo__svg .s-shadow { animation: slimo-shadow 3.2s ease-in-out infinite; }

.f--idle .eyes { transform-box: fill-box; transform-origin: 50% 50%; animation: slimo-blink 4.6s infinite; }
.f--love .heart { transform-box: fill-box; transform-origin: 50% 50%; animation: slimo-pulse 0.8s ease-in-out infinite; }
.f--confused .q { transform-box: fill-box; transform-origin: 50% 100%; animation: slimo-pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) both, slimo-bob 2s ease-in-out 0.5s infinite; }
.f--sad .tear { animation: slimo-tear 2.2s ease-in infinite; }
.f--sleepy .z { animation: slimo-zzz 2.6s ease-in-out infinite; opacity: 0; }
.f--sleepy .z2 { animation-delay: 0.8s; }
.f--sleepy .z3 { animation-delay: 1.6s; }

@keyframes slimo-breathe {
  0%, 100% { transform: scale(1, 1); }
  50%      { transform: scale(1.03, 0.955); }
}
@keyframes slimo-shadow {
  0%, 100% { transform: scaleX(1); }
  50%      { transform: scaleX(1.05); }
}
@keyframes slimo-wiggle {
  0%, 100% { transform: rotate(-3deg) scale(1.02, 0.98); }
  50%      { transform: rotate(3deg) scale(0.98, 1.03); }
}
@keyframes slimo-squish {
  0%   { transform: scale(1, 1); }
  25%  { transform: scale(1.14, 0.78); }
  55%  { transform: scale(0.92, 1.12); }
  80%  { transform: scale(1.03, 0.97); }
  100% { transform: scale(1, 1); }
}
@keyframes slimo-jump {
  0%   { transform: scale(1, 1); }
  35%  { transform: translateY(-10px) scale(0.94, 1.1); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes slimo-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%           { transform: scaleY(0.1); }
}
@keyframes slimo-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.2); }
}
@keyframes slimo-pop {
  from { transform: scale(0) rotate(-20deg); opacity: 0; }
  to   { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes slimo-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%      { transform: translateY(-4px) rotate(4deg); }
}
@keyframes slimo-tear {
  0%   { transform: translateY(0); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translateY(14px); opacity: 0; }
}
@keyframes slimo-zzz {
  0%   { transform: translate(0, 8px); opacity: 0; }
  30%  { opacity: 1; }
  100% { transform: translate(8px, -14px); opacity: 0; }
}

/* ---------- CTA shimmer ---------- */
.slimo-shimmer { position: relative; overflow: hidden; isolation: isolate; }
.slimo-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.5) 50%, transparent 70%);
  transform: translateX(-120%);
  animation: slimo-shine 3.2s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}
@keyframes slimo-shine {
  0%        { transform: translateX(-120%); }
  55%, 100% { transform: translateX(120%); }
}

/* ---------- reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .slimo__body, .slimo__svg .s-shadow, .slimo *, .slimo-shimmer::after {
    animation: none !important;
  }
  .f--sleepy .z { opacity: 1; }
}
`;
    document.head.appendChild(st);
  }


    var CYCLE = ['idle', 'confused', 'happy', 'sad', 'sleepy', 'love', 'surprised', 'wink'];

  var SAY = {
    idle:      ['Hi! I’m Slimo 👋',               'হাই! আমি স্লিমো 👋'],
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
  var AUTO_MS = 5000;
  var wrap, btn, bubbleText;
  var base = 'idle', shown = 'idle', hovering = false;
  var autoT, flashT, squishT;

  function build() {
    wrap = document.createElement('div');
    wrap.className = 'slimo-wrap';
    wrap.innerHTML =
      '<div class="slimo-bubble" aria-live="polite"><span></span></div>' +
      '<button type="button" class="slimo" data-state="idle" ' +
      'data-aria-label-en="Slimo mascot. Press to change mood." ' +
      'data-aria-label-bn="স্লিমো মাসকট। মুড বদলাতে চাপুন।">' + SVG + '</button>';
    btn = wrap.querySelector('.slimo');
    bubbleText = wrap.querySelector('.slimo-bubble span');
    refreshLang();

    btn.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovering = true;
      show(base === 'sleepy' ? 'surprised' : 'happy');
    });
    btn.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovering = false;
      show(base);
    });
    btn.addEventListener('click', function () {
      next();
      squish();
      startAuto(); /* restart the 5s timer after a tap */
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

  /* advance to the next mood */
  function next() {
    base = CYCLE[(CYCLE.indexOf(base) + 1) % CYCLE.length];
    show(base);
  }

  /* auto-change every 5 seconds */
  function startAuto() {
    clearInterval(autoT);
    autoT = setInterval(function () {
      if (document.hidden || hovering) return;
      next();
      squish();
    }, AUTO_MS);
  }

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
    startAuto();

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
