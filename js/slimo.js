/* ==========================================================
   Slimo mascot — engine, SVG, behavior.
   One IIFE. Exposes window.Slimo. No dependencies.
   Loaded with defer, after cloud.js.
   ========================================================== */
(function () {
  'use strict';

  if (window.__slimo_loaded__) return;
  window.__slimo_loaded__ = true;

  /* ---------------------------------------------------------
     0. Native storage accessors (captured before any wrapper)
     --------------------------------------------------------- */
  var _nGet, _nSet;
  try { _nGet = Storage.prototype.getItem; _nSet = Storage.prototype.setItem; }
  catch (e) { _nGet = function () {}; _nSet = function () {}; }

  function readJSON(key, fallback) {
    try { var r = _nGet.call(localStorage, key); return r ? JSON.parse(r) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, v) {
    try { _nSet.call(localStorage, key, JSON.stringify(v)); } catch (e) {}
  }

  /* ---------------------------------------------------------
     1. Prefs (local-only)
     --------------------------------------------------------- */
  var PREFS_KEY = 'nihongo_slimo_prefs';
  var prefs = Object.assign({
    enabled: true,
    size: 'normal',
    muted: false,
    lastSeenDay: '',
    recent: []
  }, readJSON(PREFS_KEY, {}));
  function savePrefs() { writeJSON(PREFS_KEY, prefs); }

  /* ---------------------------------------------------------
     2. Language + reduced motion
     --------------------------------------------------------- */
  function getLang() {
    try { return _nGet.call(localStorage, 'nihongo_lang') === 'bn' ? 'bn' : 'en'; }
    catch (e) { return 'en'; }
  }
  var rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduceMotion = rm.matches;
  try {
    rm.addEventListener('change', function (e) { reduceMotion = e.matches; });
  } catch (e) {
    try { rm.addListener(function (e) { reduceMotion = e.matches; }); } catch (e2) {}
  }

  /* ---------------------------------------------------------
     3. DOM scaffold
     --------------------------------------------------------- */
  var widget, btn, bubble, bubbleEn, bubbleBn, menu, svg;
  var bodyPath, clipPathEl, darkShape, rimPath;
  var antennaGroup, blobGroup, qMark;
  var facesRoot;
  var stateTimer = null;
  var bubbleTimer = null;

  /* ---------------------------------------------------------
     4. SVG (built as a string, injected once)
     --------------------------------------------------------- */
  var SVG = [
    '<svg class="slimo-svg" viewBox="0 0 400 400" aria-hidden="true" focusable="false">',
      '<defs><clipPath id="slimo-body-clip"><path d=""/></clipPath></defs>',
      /* ground shadow */
      '<ellipse class="slimo-ground" cx="200" cy="356" rx="118" ry="14"/>',
      /* antenna: neck + blob + "?" */
      '<g class="slimo-antenna" data-slimo-part="antenna">',
        '<path class="slimo-antenna-neck slimo-body" d="M215 150 C215 130 210 110 215 96" stroke="none"/>',
        '<g class="slimo-antenna-blob">',
          '<ellipse class="slimo-body" cx="215" cy="66" rx="34" ry="40" transform="rotate(-18 215 66)"/>',
          '<ellipse class="slimo-hi" cx="203" cy="52" rx="10" ry="7" transform="rotate(-25 203 52)"/>',
          '<circle class="slimo-hi-strong" cx="208" cy="49" r="3"/>',
        '</g>',
        '<text class="slimo-text slimo-q-mark" x="215" y="98" text-anchor="middle" font-size="52">?</text>',
      '</g>',
      /* body */
      '<path class="slimo-body slimo-body-path" d=""/>',
      '<g clip-path="url(#slimo-body-clip)">',
        '<ellipse class="slimo-dark" cx="310" cy="322" rx="220" ry="130"/>',
        '<path class="slimo-rim" d="M 60 250 Q 80 165 200 148 Q 275 152 320 208"/>',
      '</g>',
      /* highlights */
      '<ellipse class="slimo-hi" cx="120" cy="220" rx="22" ry="12" transform="rotate(-30 120 220)"/>',
      '<circle class="slimo-hi" cx="100" cy="248" r="5"/>',
      '<ellipse class="slimo-hi-strong" cx="158" cy="186" rx="4" ry="3" opacity=".55"/>',
      /* faces */
      '<g class="slimo-faces">',
        /* --- idle --- */
        '<g class="slimo-face slimo-face--idle">',
          '<g class="slimo-eyes-look">',
            '<ellipse class="slimo-eye" cx="155" cy="240" rx="14" ry="20"/>',
            '<ellipse class="slimo-eye" cx="245" cy="240" rx="14" ry="20"/>',
            '<circle class="slimo-eye-hi" cx="159" cy="232" r="5.5"/>',
            '<circle class="slimo-eye-hi" cx="249" cy="232" r="5.5"/>',
            '<circle class="slimo-eye-hi" cx="151" cy="248" r="2"/>',
            '<circle class="slimo-eye-hi" cx="241" cy="248" r="2"/>',
          '</g>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="14" ry="9"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="14" ry="9"/>',
          '<path class="slimo-mouth" d="M188 282 Q200 278 212 282 Q212 298 200 298 Q188 298 188 282Z"/>',
          '<ellipse class="slimo-tongue" cx="200" cy="292" rx="7" ry="5"/>',
        '</g>',
        /* --- talk --- */
        '<g class="slimo-face slimo-face--talk">',
          '<g class="slimo-eyes-look">',
            '<ellipse class="slimo-eye" cx="155" cy="240" rx="14" ry="20"/>',
            '<ellipse class="slimo-eye" cx="245" cy="240" rx="14" ry="20"/>',
            '<circle class="slimo-eye-hi" cx="159" cy="232" r="5.5"/>',
            '<circle class="slimo-eye-hi" cx="249" cy="232" r="5.5"/>',
            '<circle class="slimo-eye-hi" cx="151" cy="248" r="2"/>',
            '<circle class="slimo-eye-hi" cx="241" cy="248" r="2"/>',
          '</g>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="14" ry="9"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="14" ry="9"/>',
          '<ellipse class="slimo-mouth slimo-mouth--talk" cx="200" cy="288" rx="12" ry="8"/>',
        '</g>',
        /* --- think --- */
        '<g class="slimo-face slimo-face--think">',
          '<g class="slimo-eyes-look">',
            '<ellipse class="slimo-eye" cx="155" cy="236" rx="13" ry="16"/>',
            '<ellipse class="slimo-eye" cx="245" cy="236" rx="13" ry="16"/>',
            '<circle class="slimo-eye-hi" cx="159" cy="228" r="5"/>',
            '<circle class="slimo-eye-hi" cx="249" cy="228" r="5"/>',
          '</g>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="12" ry="8"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="12" ry="8"/>',
          '<path class="slimo-stroke-thin" d="M186 288 Q200 284 214 288"/>',
          '<circle class="slimo-eye" cx="278" cy="224" r="3.5"/>',
          '<circle class="slimo-eye" cx="292" cy="224" r="3.5"/>',
          '<circle class="slimo-eye" cx="306" cy="224" r="3.5"/>',
        '</g>',
        /* --- curious --- */
        '<g class="slimo-face slimo-face--curious">',
          '<g class="slimo-eyes-look">',
            '<ellipse class="slimo-eye" cx="155" cy="242" rx="12" ry="18"/>',
            '<ellipse class="slimo-eye" cx="245" cy="238" rx="10" ry="15"/>',
            '<circle class="slimo-eye-hi" cx="159" cy="234" r="5"/>',
            '<circle class="slimo-eye-hi" cx="248" cy="232" r="4"/>',
          '</g>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="13" ry="8"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="13" ry="8"/>',
          '<path class="slimo-stroke-thin" d="M186 288 Q200 282 214 288"/>',
        '</g>',
        /* --- joy --- */
        '<g class="slimo-face slimo-face--joy">',
          '<path class="slimo-stroke" d="M142 240 L162 250 L142 262"/>',
          '<path class="slimo-stroke" d="M258 240 L238 250 L258 262"/>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="14" ry="9"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="14" ry="9"/>',
          '<path class="slimo-mouth" d="M182 278 Q200 272 218 278 Q220 300 200 302 Q180 300 182 278Z"/>',
          '<ellipse class="slimo-tongue" cx="200" cy="296" rx="8" ry="5"/>',
        '</g>',
        /* --- sad --- */
        '<g class="slimo-face slimo-face--sad">',
          '<path class="slimo-stroke-thin" d="M138 232 L162 226"/>',
          '<path class="slimo-stroke-thin" d="M262 232 L238 226"/>',
          '<ellipse class="slimo-eye" cx="155" cy="246" rx="13" ry="15" transform="rotate(-12 155 246)"/>',
          '<ellipse class="slimo-eye" cx="245" cy="246" rx="13" ry="15" transform="rotate(12 245 246)"/>',
          '<circle class="slimo-eye-hi" cx="158" cy="242" r="4"/>',
          '<circle class="slimo-eye-hi" cx="248" cy="242" r="4"/>',
          '<ellipse class="slimo-blush" cx="122" cy="274" rx="13" ry="8"/>',
          '<ellipse class="slimo-blush" cx="278" cy="274" rx="13" ry="8"/>',
          '<path class="slimo-stroke-thin" d="M186 294 Q200 286 214 294"/>',
          '<path class="slimo-hi-strong" d="M148 260 Q144 268 148 272 Q152 268 148 260Z" opacity=".6"/>',
        '</g>',
        /* --- sleep --- */
        '<g class="slimo-face slimo-face--sleep">',
          '<path class="slimo-stroke-thin" d="M138 246 L172 246"/>',
          '<path class="slimo-stroke-thin" d="M228 246 L262 246"/>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="12" ry="8"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="12" ry="8"/>',
          '<ellipse class="slimo-mouth" cx="200" cy="290" rx="6" ry="7"/>',
        '</g>',
        /* --- tired --- */
        '<g class="slimo-face slimo-face--tired">',
          '<path class="slimo-stroke-thin" d="M138 244 L172 244"/>',
          '<path class="slimo-stroke-thin" d="M228 244 L262 244"/>',
          '<ellipse class="slimo-eye" cx="155" cy="252" rx="13" ry="8"/>',
          '<ellipse class="slimo-eye" cx="245" cy="252" rx="13" ry="8"/>',
          '<ellipse class="slimo-blush" cx="122" cy="274" rx="12" ry="8"/>',
          '<ellipse class="slimo-blush" cx="278" cy="274" rx="12" ry="8"/>',
          '<path class="slimo-stroke-thin" d="M188 288 Q200 284 212 288"/>',
        '</g>',
        /* --- wink --- */
        '<g class="slimo-face slimo-face--wink">',
          '<path class="slimo-stroke" d="M142 244 Q155 236 168 244"/>',
          '<g class="slimo-eyes-look">',
            '<ellipse class="slimo-eye" cx="245" cy="240" rx="14" ry="20"/>',
            '<circle class="slimo-eye-hi" cx="249" cy="232" r="5.5"/>',
            '<circle class="slimo-eye-hi" cx="241" cy="248" r="2"/>',
          '</g>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="14" ry="9"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="14" ry="9"/>',
          '<path class="slimo-stroke-thin" d="M184 282 Q200 296 216 282"/>',
        '</g>',
        /* --- surprised --- */
        '<g class="slimo-face slimo-face--surprised">',
          '<circle class="slimo-eye" cx="155" cy="240" r="17"/>',
          '<circle class="slimo-eye" cx="245" cy="240" r="17"/>',
          '<circle class="slimo-eye-hi" cx="150" cy="234" r="5.5"/>',
          '<circle class="slimo-eye-hi" cx="240" cy="234" r="5.5"/>',
          '<ellipse class="slimo-blush" cx="122" cy="278" rx="14" ry="8"/>',
          '<ellipse class="slimo-blush" cx="278" cy="278" rx="14" ry="8"/>',
          '<ellipse class="slimo-mouth" cx="200" cy="292" rx="10" ry="13"/>',
          '<ellipse class="slimo-tongue" cx="200" cy="298" rx="6" ry="6"/>',
        '</g>',
        /* --- love --- */
        '<g class="slimo-face slimo-face--love">',
          '<path class="slimo-mouth" style="fill:#FF5FA2" d="M155 232 C140 220 145 208 155 214 C165 208 170 220 155 232Z"/>',
          '<path class="slimo-mouth" style="fill:#FF5FA2" d="M245 232 C230 220 235 208 245 214 C255 208 260 220 245 232Z"/>',
          '<ellipse class="slimo-blush" cx="122" cy="274" rx="15" ry="10"/>',
          '<ellipse class="slimo-blush" cx="278" cy="274" rx="15" ry="10"/>',
          '<path class="slimo-mouth" d="M184 282 Q200 276 216 282 Q216 300 200 300 Q184 300 184 282Z"/>',
          '<ellipse class="slimo-tongue" cx="200" cy="294" rx="7" ry="5"/>',
        '</g>',
        /* --- proud --- */
        '<g class="slimo-face slimo-face--proud">',
          '<g class="slimo-eyes-look">',
            '<ellipse class="slimo-eye" cx="155" cy="240" rx="14" ry="18"/>',
            '<ellipse class="slimo-eye" cx="245" cy="240" rx="14" ry="18"/>',
            '<circle class="slimo-eye-hi" cx="159" cy="234" r="5.5"/>',
            '<circle class="slimo-eye-hi" cx="249" cy="234" r="5.5"/>',
          '</g>',
          '<ellipse class="slimo-blush" cx="122" cy="274" rx="15" ry="10"/>',
          '<ellipse class="slimo-blush" cx="278" cy="274" rx="15" ry="10"/>',
          '<path class="slimo-stroke-thin" d="M182 282 Q200 292 218 282"/>',
          '<path style="fill:#FFD84D" d="M300 210 l4 10 11 1 -8 8 2 11 -9 -5 -9 5 2 -11 -8 -8 11 -1Z"/>',
        '</g>',
        /* --- celebrate --- */
        '<g class="slimo-face slimo-face--celebrate">',
          '<path class="slimo-stroke" d="M142 240 L162 250 L142 262"/>',
          '<path class="slimo-stroke" d="M258 240 L238 250 L258 262"/>',
          '<ellipse class="slimo-blush" cx="122" cy="272" rx="14" ry="9"/>',
          '<ellipse class="slimo-blush" cx="278" cy="272" rx="14" ry="9"/>',
          '<path class="slimo-mouth" d="M182 278 Q200 272 218 278 Q220 300 200 302 Q180 300 182 278Z"/>',
          '<ellipse class="slimo-tongue" cx="200" cy="296" rx="8" ry="5"/>',
          '<text class="slimo-text" x="308" y="200" font-size="40">!</text>',
        '</g>',
      '</g>',
      /* Zzz */
      '<g class="slimo-zzz">',
        '<text class="slimo-text slimo-z slimo-z1" x="270" y="120" font-size="20">Z</text>',
        '<text class="slimo-text slimo-z slimo-z2" x="296" y="96"  font-size="26">Z</text>',
        '<text class="slimo-text slimo-z slimo-z3" x="324" y="68"  font-size="34">Z</text>',
      '</g>',
      /* confetti (populated on celebrate) */
      '<g class="slimo-confetti"></g>',
    '</svg>'
  ].join('');

  /* ---------------------------------------------------------
     5. Body geometry: 14 anchors + Catmull-Rom to Bezier
     --------------------------------------------------------- */
  var ANCHORS = [
    { x: 215, y: 150 }, // 0 peak (slightly right of center)
    { x: 275, y: 170 }, // 1 right upper
    { x: 320, y: 212 }, // 2 right mid
    { x: 348, y: 265 }, // 3 right lower
    { x: 360, y: 310 }, // 4 right lobe outer
    { x: 305, y: 328 }, // 5 right lobe bottom
    { x: 255, y: 333 }, // 6 dip
    { x: 200, y: 331 }, // 7 center
    { x: 145, y: 333 }, // 8 dip
    { x: 95,  y: 328 }, // 9 left lobe bottom
    { x: 40,  y: 310 }, // 10 left lobe outer
    { x: 52,  y: 260 }, // 11 left lower
    { x: 80,  y: 205 }, // 12 left shoulder bulge
    { x: 130, y: 168 }  // 13 left upper
  ];
  var BASE_X = 200, BASE_Y = 332, N = ANCHORS.length;

  function fmt(v) { return Math.round(v * 100) / 100; }

  function buildPath(pts) {
    var d = 'M' + fmt(pts[0].x) + ' ' + fmt(pts[0].y);
    for (var i = 0; i < pts.length; i++) {
      var p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      var c1x = p1.x + (p2.x - p0.x) / 6;
      var c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6;
      var c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + fmt(c1x) + ' ' + fmt(c1y) + ' ' + fmt(c2x) + ' ' + fmt(c2y) + ' ' + fmt(p2.x) + ' ' + fmt(p2.y);
    }
    return d + 'Z';
  }

  /* ---------------------------------------------------------
     6. Spring
     --------------------------------------------------------- */
  function Spring(k, c) { this.x = 0; this.v = 0; this.k = k; this.c = c; }
  Spring.prototype.step = function (dt) {
    var a = -this.k * this.x - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
  };
  Spring.prototype.impulse = function (v) { this.v += v; };
  Spring.prototype.reset = function () { this.x = 0; this.v = 0; };
  Spring.prototype.idle = function () {
    return Math.abs(this.x) < 0.02 && Math.abs(this.v) < 0.02;
  };

  /* Body-scale springs (squash/stretch) */
  var sxSpring = new Spring(190, 14);
  var sySpring = new Spring(190, 14);
  /* Antenna: two chained rotations */
  var antSpring1 = new Spring(70, 7);
  var antSpring2 = new Spring(110, 9);
  /* Look offsets */
  var lookX = 0, lookY = 0, lookTX = 0, lookTY = 0;

  /* Per-anchor springs (organic wobble on top of squash) */
  var ANCHOR_K = [130,140,150,160,170,190,200,200,200,190,170,160,150,140];
  var ANCHOR_C = [ 9, 10, 10, 11, 12, 13, 14, 14, 14, 13, 12, 11, 10, 10];
  var anchorSprings = [];
  for (var ai = 0; ai < N; ai++) {
    anchorSprings.push({ dx: new Spring(ANCHOR_K[ai], ANCHOR_C[ai]),
                         dy: new Spring(ANCHOR_K[ai], ANCHOR_C[ai]) });
  }

  /* Jump physics */
  var jumpY = 0, jumpV = 0;
  var GRAVITY = 2400;

  /* State machine */
  var currentState = 'idle';
  var baseState = 'idle';
  var statePriority = 0;
  var stateEndAt = 0;

  var STATE_TO_FACE = {
    idle: 'idle', talk: 'talk', think: 'think', curious: 'curious',
    joy: 'joy', sad: 'sad', sleep: 'sleep', sleepy: 'sleep',
    tired: 'tired', wink: 'wink', surprised: 'surprised', love: 'love',
    proud: 'proud', celebrate: 'celebrate',
    wave: 'joy', cheer: 'joy', dance: 'joy', jump: 'surprised',
    doubleJump: 'joy', dragged: 'surprised', poke: 'joy',
    cozy: 'sleep', night: 'sleep', think_, // placeholder
  };
  delete STATE_TO_FACE.think_;

  var PRIORITY = {
    idle: 0, talk: 1, think: 1, curious: 1, tired: 1, sleep: 1,
    wink: 2, joy: 3, sad: 3, love: 3, surprised: 3, proud: 3,
    wave: 3, cheer: 3, dance: 4, jump: 4, doubleJump: 5,
    celebrate: 9, poke: 2, dragged: 2
  };

  /* ---------------------------------------------------------
     7. Idle behaviors
     --------------------------------------------------------- */
  var idleTimer = null;
  var lastActivity = performance.now();
  var idleYawned = false;
  var correctStreak = 0;
  var lastAnswerAt = 0;

  /* ---------------------------------------------------------
     8. Speech pool (4-6 lines per event, no repeat in a row)
     --------------------------------------------------------- */
  var LINES = {
    greetMorning: [
      { en: 'Good morning! ☀️', bn: 'শুভ সকাল! ☀️' },
      { en: 'Morning! Ready to learn?', bn: 'সকাল! শিখতে প্রস্তুত?' },
      { en: 'Rise and shine!', bn: 'উঠে পড়ো!' }
    ],
    greetAfternoon: [
      { en: 'Good afternoon!', bn: 'শুভ অপরাহ্ন!' },
      { en: 'Hey there! 👋', bn: 'হ্যালো! 👋' },
      { en: 'Afternoon study time?', bn: 'বিকেলে পড়া?' }
    ],
    greetEvening: [
      { en: 'Good evening! 🌙', bn: 'শুভ সন্ধ্যা! 🌙' },
      { en: 'Evening! Let’s study.', bn: 'সন্ধ্যা! পড়া যাক।' },
      { en: 'Nice to see you!', bn: 'তোমাকে দেখে ভালো লাগল!' }
    ],
    welcomeBack: [
      { en: 'Welcome back! 👋', bn: 'ফিরে এসেছ! 👋' },
      { en: 'Missed you!', bn: 'তোমাকে মিস করেছি!' },
      { en: 'Good to see you again!', bn: 'আবার দেখা হয়ে ভালো লাগল!' }
    ],
    lessonComplete: [
      { en: 'Lesson complete! 🎉', bn: 'লেসন শেষ! 🎉' },
      { en: 'You did it! ✨', bn: 'তুমি পারলে! ✨' },
      { en: 'Another one down!', bn: 'আরেকটা শেষ!' }
    ],
    progressTick: [
      { en: 'Nice progress!', bn: 'ভালো এগোচ্ছে!' },
      { en: 'Keep going!', bn: 'চালিয়ে যাও!' },
      { en: 'Almost there!', bn: 'প্রায় শেষ!' }
    ],
    srsAgain: [
      { en: "Don't worry, try again!", bn: 'চিন্তা নেই, আবার চেষ্টা করো!' },
      { en: 'We’ll get it next time.', bn: 'পরেরবার হয়ে যাবে।' },
      { en: 'That one’s tricky!', bn: 'ওটা একটু কঠিন!' }
    ],
    srsHard: [
      { en: 'Hmm, tricky one.', bn: 'হুম, কঠিন।' },
      { en: 'Take your time.', bn: 'সময় নাও।' },
      { en: 'Let’s think.', bn: 'ভাবি।' }
    ],
    srsGood: [
      { en: 'Nice!', bn: 'দারুণ!' },
      { en: 'Good job!', bn: 'ভালো করেছ!' },
      { en: 'Keep it up!', bn: 'চালিয়ে যাও!' }
    ],
    srsEasy: [
      { en: 'Easy peasy! 🌟', bn: 'সহজ! 🌟' },
      { en: 'You know it!', bn: 'তুমি জানো!' },
      { en: 'Smooth!', bn: 'সাবলীল!' }
    ],
    srsStreak3: [
      { en: 'On a roll! ✨', bn: 'দারুণ চলছে! ✨' },
      { en: '3 in a row!', bn: 'পরপর ৩টা!' },
      { en: 'Hot streak!', bn: 'গরম ছন্দ!' }
    ],
    srsStreak5: [
      { en: '5 in a row! 🎯', bn: 'পরপর ৫টা! 🎯' },
      { en: 'Unstoppable!', bn: 'অপ্রতিরোধ্য!' },
      { en: 'Amazing streak!', bn: 'অসাধারণ ধারা!' }
    ],
    srsSessionDone: [
      { en: 'Session complete!', bn: 'সেশন সম্পূর্ণ!' },
      { en: 'All caught up!', bn: 'সব শেষ!' },
      { en: 'Done for now!', bn: 'এখনকার মতো শেষ!' }
    ],
    streakUp: [
      { en: 'Streak! 🔥', bn: 'ধারা! 🔥' },
      { en: 'Day after day!', bn: 'দিনের পর দিন!' },
      { en: 'Keep the streak!', bn: 'ধারা ধরে রাখো!' }
    ],
    streakMilestone: [
      { en: 'Amazing streak!', bn: 'অসাধারণ ধারা!' },
      { en: 'Legendary! 🏆', bn: 'কিংবদন্তি! 🏆' },
      { en: 'You’re on fire! 🔥', bn: 'তুমি জ্বলে উঠেছ! 🔥' }
    ],
    streakLost: [
      { en: 'Let’s rebuild it! 💪', bn: 'আবার গড়ি! 💪' },
      { en: 'Fresh start!', bn: 'নতুন শুরু!' },
      { en: 'Today counts!', bn: 'আজকের দিনও গোনে!' }
    ],
    newBest: [
      { en: 'New best! 🏅', bn: 'নতুন সেরা! 🏅' },
      { en: 'Record broken!', bn: 'রেকর্ড ভাঙা!' },
      { en: 'Getting better!', bn: 'আরও ভালো হচ্ছে!' }
    ],
    lowScore: [
      { en: 'Try again — you got this!', bn: 'আবার চেষ্টা — তুমি পারবে!' },
      { en: 'Not bad, keep going!', bn: 'খারাপ না, চালিয়ে যাও!' },
      { en: 'Next one’s yours!', bn: 'পরেরটা তোমার!' }
    ],
    perfect: [
      { en: 'Perfect score! 🌟', bn: 'পারফেক্ট স্কোর! 🌟' },
      { en: 'Flawless!', bn: 'নিখুঁত!' },
      { en: '100%!', bn: '১০০%!' }
    ],
    bookmarkAdded: [
      { en: 'Saved! 📌', bn: 'সেভ হলো! 📌' },
      { en: 'Bookmarked!', bn: 'বুকমার্ক হলো!' }
    ],
    bookmarkRemoved: [
      { en: 'Removed.', bn: 'সরানো হলো।' },
      { en: 'Un-bookmarked.', bn: 'আনবুকমার্ক হলো।' }
    ],
    langChange: [
      { en: 'Language switched!', bn: 'ভাষা বদলেছে!' },
      { en: 'Let’s keep learning!', bn: 'শেখা চালিয়ে যাই!' }
    ],
    darkOn: [
      { en: 'Cozy mode 🌙', bn: 'আরাম মোড 🌙' },
      { en: 'Night owl! 🦉', bn: 'রাতজাগা! 🦉' }
    ],
    darkOff: [
      { en: 'Good morning light ☀️', bn: 'সকালের আলো ☀️' },
      { en: 'Back to the light!', bn: 'আলোয় ফিরলাম!' }
    ],
    yawn: [
      { en: 'Yawwwn…', bn: 'হাই…' },
      { en: 'So sleepy…', bn: 'ঘুম পাচ্ছে…' },
      { en: 'A little tired…', bn: 'একটু ক্লান্ত…' }
    ],
    wake: [
      { en: 'Oh! I’m up!', bn: 'ও! জেগে গেছি!' },
      { en: 'Huh?! Yes?!', bn: 'কী?! হ্যাঁ?!' }
    ],
    audioPlay: [
      { en: 'Listening… 🎧', bn: 'শুনছি… 🎧' },
      { en: 'Sounds good!', bn: 'ভালো শোনাচ্ছে!' }
    ],
    noResults: [
      { en: 'Hmm, nothing…', bn: 'হুম, কিছু নেই…' },
      { en: 'No matches!', bn: 'মিল নেই!' }
    ],
    correct: [
      { en: 'Correct! ✓', bn: 'সঠিক! ✓' },
      { en: 'Yes!', bn: 'হ্যাঁ!' },
      { en: 'Spot on!', bn: 'একদম ঠিক!' }
    ],
    wrong: [
      { en: 'Not quite.', bn: 'একদম না।' },
      { en: 'Try again.', bn: 'আবার চেষ্টা করো।' },
      { en: 'Close!', bn: 'কাছাকাছি!' }
    ],
    fastCorrect: [
      { en: 'Wow, fast! ⚡', bn: 'ওয়াও, দ্রুত! ⚡' },
      { en: 'Lightning quick!', bn: 'বিদ্যুৎ গতি!' }
    ],
    poke: [
      { en: 'Boop!', bn: 'বুপ!' },
      { en: 'Eep!', bn: 'ইক!' },
      { en: 'Hello there!', bn: 'হ্যালো!' },
      { en: 'That tickles!', bn: 'গুদগুদ লাগছে!' }
    ],
    dance: [
      { en: 'Dance time! 🕺', bn: 'নাচের সময়! 🕺' },
      { en: 'Let’s groove!', bn: 'চলো নাচি!' }
    ],
    jump: [
      { en: 'Wheee!', bn: 'হুইইই!' },
      { en: 'Boing!', bn: 'বয়িং!' }
    ]
  };

  function pickLine(key) {
    var pool = LINES[key];
    if (!pool || !pool.length) return null;
    var recent = prefs.recent || [];
    var available = [];
    for (var i = 0; i < pool.length; i++) {
      if (recent.indexOf(key + ':' + i) < 0) available.push(i);
    }
    if (!available.length) {
      available = [];
      for (var j = 0; j < pool.length; j++) available.push(j);
    }
    var idx = available[Math.floor(Math.random() * available.length)];
    recent.unshift(key + ':' + idx);
    prefs.recent = recent.slice(0, 10);
    savePrefs();
    return pool[idx];
  }

  /* ---------------------------------------------------------
     9. Build widget DOM
     --------------------------------------------------------- */
  function build() {
    widget = document.createElement('div');
    widget.className = 'slimo-widget';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Slimo mascot');
    if (!prefs.enabled) widget.hidden = true;

    bubble = document.createElement('div');
    bubble.className = 'slimo-bubble';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');
    bubble.setAttribute('data-open', 'false');
    bubble.innerHTML = '<span class="slimo-bubble__en"></span><span class="slimo-bubble__bn"></span>';
    bubbleEn = bubble.querySelector('.slimo-bubble__en');
    bubbleBn = bubble.querySelector('.slimo-bubble__bn');
    bubble.addEventListener('click', function () { closeBubble(); });

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slimo-button';
    btn.setAttribute('data-face', 'idle');
    btn.setAttribute('aria-label', 'Slimo mascot. Press to poke.');
    btn.innerHTML = SVG;

    menu = document.createElement('div');
    menu.className = 'slimo-menu';
    menu.setAttribute('data-open', 'false');
    menu.innerHTML =
      '<button type="button" data-action="mute">Mute</button>' +
      '<button type="button" data-action="hide">Hide</button>' +
      '<button type="button" data-action="dance">Dance!</button>' +
      '<button type="button" data-action="jump">Jump!</button>';
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-action]');
      if (!b) return;
      var a = b.getAttribute('data-action');
      if (a === 'mute') { prefs.muted = !prefs.muted; savePrefs(); say({ en: prefs.muted ? 'Muted.' : 'Unmuted.', bn: prefs.muted ? 'মিউট।' : 'আনমিউট।' }); }
      if (a === 'hide') { hide(); }
      if (a === 'dance') { setState('dance', 2400); }
      if (a === 'jump') { setState('jump', 900); }
      closeMenu();
    });

    widget.appendChild(bubble);
    widget.appendChild(btn);
    widget.appendChild(menu);

    svg          = btn.querySelector('svg');
    bodyPath     = svg.querySelector('.slimo-body-path');
    clipPathEl   = svg.querySelector('#slimo-body-clip path');
    antennaGroup = svg.querySelector('.slimo-antenna');
    blobGroup    = svg.querySelector('.slimo-antenna-blob');
    qMark        = svg.querySelector('.slimo-q-mark');

    bindPointer();
    bindKeyboard();

    if (document.querySelector('.shell-bottomnav, [data-bottom-nav]')) {
      widget.classList.add('slimo-widget--above-nav');
    }
  }

  /* ---------------------------------------------------------
     10. Pointer / keyboard
     --------------------------------------------------------- */
  var drag = null;
  var pressTimer = null;
  var lastTapAt = 0;
  var dragOffsetX = 0, dragOffsetY = 0;

  function bindPointer() {
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.pointerType === 'mouse') btn.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now() };
      pressTimer = setTimeout(function () {
        if (drag && !drag.moved) openMenu();
      }, 550);
    });

    btn.addEventListener('pointermove', function (e) {
      // Look direction from pointer position
      var r = btn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      lookTX = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 1.6))) * 10;
      lookTY = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 1.6))) * 8;
      lastActivity = performance.now();

      if (!drag) return;
      var dx = e.clientX - drag.sx;
      var dy = e.clientY - drag.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        drag.moved = true;
        clearTimeout(pressTimer);
        dragOffsetX = dx * 0.45;
        dragOffsetY = dy * 0.45;
        // stretch toward pointer
        sxSpring.x = dx * 0.004;
        sySpring.x = -dy * 0.002;
        setFace('surprised');
      }
    });

    function endDrag(e) {
      if (!drag) return;
      clearTimeout(pressTimer);
      try { if (e.pointerType === 'mouse') btn.releasePointerCapture(e.pointerId); } catch (er) {}
      var wasDrag = drag.moved;
      var dt = performance.now() - drag.t;
      drag = null;
      if (wasDrag) {
        // elastic snap-back
        dragOffsetX = 0; dragOffsetY = 0;
        sxSpring.impulse(-6); sySpring.impulse(4);
        setState(baseState, 0);
        return;
      }
      // tap
      if (dt < 320 && lastTapAt && performance.now() - lastTapAt < 320) {
        lastTapAt = 0;
        setState('dance', 2400);
        return;
      }
      lastTapAt = performance.now();
      setState('poke', 500);
      squashImpulse(0.9);
      say(pickLine('poke'), 1600);
    }
    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);
    btn.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') { lookTX = 0; lookTY = 0; }
    });
  }

  function bindKeyboard() {
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setState('poke', 500);
        squashImpulse(0.9);
        say(pickLine('poke'), 1600);
      } else if (e.key === 'Escape') {
        closeMenu();
        closeBubble();
      }
    });
  }

  /* ---------------------------------------------------------
     11. Speech
     --------------------------------------------------------- */
  var lastBubbleAt = 0;

  function say(msg, duration) {
    if (prefs.muted || !bubble) return;
    var now = performance.now();
    if (now - lastBubbleAt < 4000) return;   // 1 bubble per 4 s
    lastBubbleAt = now;

    if (typeof msg === 'string') msg = { en: msg, bn: msg };
    if (!msg || !msg.en) return;
    if (!msg.bn) msg.bn = msg.en;

    bubbleEn.textContent = msg.en;
    bubbleBn.textContent = msg.bn;
    bubble.setAttribute('data-open', 'true');
    widget.classList.add('slimo-talking');

    clearTimeout(bubbleTimer);
    var d = duration || 3200;
    bubbleTimer = setTimeout(function () {
      closeBubble();
    }, d);
  }

  function closeBubble() {
    if (!bubble) return;
    bubble.setAttribute('data-open', 'false');
    widget.classList.remove('slimo-talking');
  }

  /* ---------------------------------------------------------
     12. Menu
     --------------------------------------------------------- */
  function openMenu() { if (menu) menu.setAttribute('data-open', 'true'); }
  function closeMenu() { if (menu) menu.setAttribute('data-open', 'false'); }

  /* ---------------------------------------------------------
     13. State machine + motion
     --------------------------------------------------------- */
  function setFace(face) {
    if (btn) btn.setAttribute('data-face', face);
  }

  function setState(name, duration, priority) {
    if (!btn) return;
    var face = STATE_TO_FACE[name] || 'idle';
    var p = priority !== undefined ? priority : (PRIORITY[name] || 3);
    var now = performance.now();

    if (now < stateEndAt && p < statePriority) return;
    if (name === currentState && !duration) return;

    currentState = name;
    statePriority = p;
    setFace(face);

    if (duration) {
      stateEndAt = now + duration;
      clearTimeout(stateTimer);
      stateTimer = setTimeout(function () {
        if (performance.now() >= stateEndAt - 8) {
          setState(baseState, 0, PRIORITY[baseState] || 0);
        }
      }, duration + 10);
    } else {
      stateEndAt = 0;
      baseState = name;
    }

    if (MOTIONS[name] && !reduceMotion) {
      try { MOTIONS[name](); } catch (e) {}
    }
  }

  var MOTIONS = {
    jump: function () { doJump(520); },
    doubleJump: function () { doJump(680); },
    dance: function () { squashImpulse(0.6); },
    cheer: function () { squashImpulse(0.5); },
    celebrate: function () { squashImpulse(0.9); spawnConfetti(); },
    wave: function () { squashImpulse(0.4); },
    poke: function () { squashImpulse(0.9); }
  };

  function squashImpulse(amount) {
    if (reduceMotion) return;
    sySpring.impulse(-amount * 9);
    sxSpring.impulse(amount * 4.5);
    // secondary per-anchor wobble, top anchors more
    for (var i = 0; i < N; i++) {
      var a = ANCHORS[i];
      var k = 1 - (BASE_Y - a.y) / (BASE_Y - 100);
      var f = (Math.random() * 2 - 1) * amount * 60 * k;
      anchorSprings[i].dx.impulse(f);
      anchorSprings[i].dy.impulse(-Math.abs(f) * 0.6);
    }
  }

  function doJump(force) {
    if (reduceMotion) return;
    squashImpulse(1.0);
    setTimeout(function () {
      if (jumpY === 0) {
        jumpV = -force;
        sySpring.impulse(6);
      }
    }, 90);
  }

  function spawnConfetti() {
    var g = svg && svg.querySelector('.slimo-confetti');
    if (!g) return;
    g.innerHTML = '';
    for (var i = 0; i < 14; i++) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      c.setAttribute('x', 195 + (Math.random() * 20 - 10));
      c.setAttribute('y', 200);
      c.setAttribute('width', 6 + Math.random() * 4);
      c.setAttribute('height', 6 + Math.random() * 4);
      c.setAttribute('rx', 1.5);
      c.setAttribute('class', 'slimo-confetti-' + (1 + (i % 4)));
      g.appendChild(c);
      var dx = Math.random() * 240 - 120;
      var dy = -80 - Math.random() * 140;
      var rot = Math.random() * 720 - 360;
      try {
        c.animate(
          [
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)', opacity: 0 }
          ],
          { duration: 1200 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
        );
      } catch (e) { /* no WAAPI */ }
    }
    setTimeout(function () { if (g) g.innerHTML = ''; }, 2200);
  }

  /* ---------------------------------------------------------
     14. Frame loop
     --------------------------------------------------------- */
  var running = false;
  var rafId = 0;
  var lastT = 0;
  var antPose = { rot: 0, scaleY: 1 };
  var actionQueue = [];

  function schedule(delaySec, fn) {
    actionQueue.push({ at: performance.now() + delaySec * 1000, fn: fn });
    actionQueue.sort(function (a, b) { return a.at - b.at; });
  }
  function flushQueue(now) {
    while (actionQueue.length && actionQueue[0].at <= now) {
      var it = actionQueue.shift();
      try { it.fn(); } catch (e) {}
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    flushQueue(now);
    update(dt, now);
    rafId = requestAnimationFrame(frame);
  }

  function update(dt, now) {
    /* --- breathe --- */
    var breathFreq = (currentState === 'sleep' || currentState === 'sleepy' || currentState === 'tired') ? 1.1 : 1.5;
    var breathAmp = (currentState === 'sleep' || currentState === 'tired') ? 0.025 : 0.012;
    var breath = 1 + Math.sin(now / 1000 * breathFreq) * breathAmp;

    /* --- springs --- */
    sxSpring.step(dt);
    sySpring.step(dt);
    antSpring1.step(dt);
    antSpring2.step(dt);

    // look: exponential smoothing
    var lk = Math.min(1, dt * 10);
    lookX += (lookTX - lookX) * lk;
    lookY += (lookTY - lookY) * lk;

    /* --- state-end handling --- */
    if (stateEndAt && now >= stateEndAt) {
      stateEndAt = 0;
      setState(baseState, 0, PRIORITY[baseState] || 0);
    }

    /* --- jump physics --- */
    if (jumpV !== 0 || jumpY !== 0) {
      jumpV += GRAVITY * dt;
      jumpY += jumpV * dt;
      if (jumpY >= 0) {
        jumpY = 0;
        if (jumpV > 180) squashImpulse(0.8);
        jumpV = 0;
      }
    }

    /* --- body squash/stretch from springs --- */
    var sX = 1 + sxSpring.x * 0.02;
    var sY = 1 + sySpring.x * 0.02;
    // volume conservation
    sX = 1 + (sX - 1) * 0.55;
    sY = 1 - (sX - 1) * 0.8;

    /* --- rebuild body path --- */
    var pts = new Array(N);
    for (var i = 0; i < N; i++) {
      var a = ANCHORS[i];
      var as = anchorSprings[i];
      as.dx.step(dt);
      as.dy.step(dt);

      // breathing applied more to top, less to base
      var yt = (BASE_Y - a.y) / (BASE_Y - 100);
      var bX = 1 + (sX - 1) * yt;
      var bY = 1 + (sY - 1) * yt * breath;

      var px = BASE_X + (a.x - BASE_X) * bX + as.dx.x + dragOffsetX;
      var py = BASE_Y + (a.y - BASE_Y) * bY + as.dy.x + dragOffsetY + jumpY;
      pts[i] = { x: px, y: py };
    }
    var d = buildPath(pts);
    if (bodyPath) bodyPath.setAttribute('d', d);
    if (clipPathEl) clipPathEl.setAttribute('d', d);

    /* --- antenna transform --- */
    if (antennaGroup) {
      var targetRot = 0, targetScale = 1;
      if (currentState === 'sad') targetRot = -28;
      else if (currentState === 'curious') targetRot = 10;
      else if (currentState === 'sleep' || currentState === 'sleepy' || currentState === 'tired') targetScale = 0.4;
      else if (currentState === 'surprised') targetRot = -6;
      var lkA = Math.min(1, dt * 7);
      antPose.rot += (targetRot - antPose.rot) * lkA;
      antPose.scaleY += (targetScale - antPose.scaleY) * lkA;

      var peakY = BASE_Y + (ANCHORS[0].y - BASE_Y) * (1 + (sY - 1)) ;
      var t =
        'translate(0 ' + (peakY - ANCHORS[0].y).toFixed(2) + ') ' +
        'translate(' + (ANCHORS[0].x) + ' ' + (ANCHORS[0].y) + ') ' +
        'rotate(' + (antPose.rot + antSpring1.x).toFixed(2) + ') ' +
        'scale(1 ' + antPose.scaleY.toFixed(3) + ') ' +
        'translate(' + (-ANCHORS[0].x) + ' ' + (-ANCHORS[0].y) + ')';
      antennaGroup.setAttribute('transform', t);
    }
    if (blobGroup) {
      blobGroup.setAttribute(
        'transform',
        'rotate(' + antSpring2.x.toFixed(2) + ' 215 96)'
      );
    }

    /* --- eye look --- */
    var eyes = svg.querySelectorAll('.slimo-eyes-look');
    if (eyes.length) {
      var lx = lookX.toFixed(2), ly = lookY.toFixed(2);
      for (var e = 0; e < eyes.length; e++) {
        eyes[e].setAttribute('transform', 'translate(' + lx + ' ' + ly + ')');
      }
    }

    /* --- ground shadow scales with jumpY --- */
    var shadow = svg.querySelector('.slimo-ground');
    if (shadow) {
      var t2 = Math.max(0, -jumpY) / 300;
      var sc = 1 - Math.min(0.45, t2);
      shadow.setAttribute('transform', 'translate(200 356) scale(' + sc.toFixed(3) + ' 1) translate(-200 -356)');
      shadow.setAttribute('opacity', (0.55 * (1 - t2 * 0.7)).toFixed(3));
    }

    /* --- idle scheduling --- */
    if (!idleTimer) scheduleIdle();
    checkIdle(now);
  }

  function start() {
    if (running) return;
    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* ---------------------------------------------------------
     15. Idle behaviors
     --------------------------------------------------------- */
  function scheduleIdle() {
    var delay = 4500 + Math.random() * 6000;
    idleTimer = setTimeout(function () {
      idleTimer = null;
      if (!running || document.hidden) return;
      if (currentState === 'idle' || currentState === 'proud' || currentState === 'joy') {
        var roll = Math.random();
        if (roll < 0.25) {
          // small look-around
          lookTX = (Math.random() * 2 - 1) * 8;
          lookTY = (Math.random() * 2 - 1) * 5;
          setTimeout(function () { lookTX = 0; lookTY = 0; }, 900);
        } else if (roll < 0.5) {
          // small hop
          if (!reduceMotion) { jumpV = -180; }
        } else if (roll < 0.75) {
          // antenna sway
          antSpring1.impulse((Math.random() - 0.5) * 2);
        } else {
          // blink
          doBlink();
        }
      }
    }, delay);
  }

  function doBlink() {
    var groups = svg.querySelectorAll('.slimo-eyes-look');
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      g.classList.add('slimo-blink');
      (function (gg) {
        setTimeout(function () { gg.classList.remove('slimo-blink'); }, 220);
      })(g);
    }
    // occasional double-blink
    if (Math.random() < 0.18) {
      setTimeout(doBlink, 180);
    }
  }

  function checkIdle(now) {
    var idle = now - lastActivity;
    if (idle > 120000 && currentState !== 'sleep') {
      setState('sleep', 0, 1);
      idleYawned = true;
    } else if (idle > 45000 && !idleYawned && currentState === 'idle') {
      idleYawned = true;
      setState('tired', 5000, 1);
      say(pickLine('yawn'), 2000);
    }
  }

  /* Wake on any activity */
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
    document.addEventListener(evt, function () {
      lastActivity = performance.now();
      idleYawned = false;
      if (currentState === 'sleep' || currentState === 'tired') {
        setState('surprised', 900, 3);
        say(pickLine('wake'), 1500);
      }
    }, true);
  });

  /* ---------------------------------------------------------
     16. Activity detection (Storage.setItem interceptor)
     --------------------------------------------------------- */
  var _origSetItem = _nSet;
  try {
    Storage.prototype.setItem = function (key, value) {
      var oldRaw = null;
      try { oldRaw = _nGet.call(this, key); } catch (e) {}
      var r = _origSetItem.call(this, key, value);
      try { handleStorageChange(key, oldRaw, value); } catch (e) {}
      return r;
    };
  } catch (e) {}

  function safeJSON(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  function handleStorageChange(key, oldRaw, newRaw) {
    if (!prefs.enabled) return;
    switch (key) {
      case 'nihongo_progress':                 return onProgress(oldRaw, newRaw);
      case 'nihongo_srs_log':                  return onSRSLog(oldRaw, newRaw);
      case 'nihongo_srs_meta':                 return onSRSMeta(oldRaw, newRaw);
      case 'nihongo_quiz_history':             return onQuizHistory(oldRaw, newRaw);
      case 'nihongo_kanji_quiz_history':       return onQuizHistory(oldRaw, newRaw);
      case 'nihongo_placement_result':         return onPlacement(oldRaw, newRaw);
      case 'nihongo_bookmarks':                return onBookmarks(oldRaw, newRaw);
      case 'nihongo_lang':                     return onLangChange();
    }
  }

  function onProgress(o, n) {
    var a = safeJSON(o) || {}, b = safeJSON(n) || {};
    var aC = (a.completedLessons || []).length;
    var bC = (b.completedLessons || []).length;
    if (bC > aC) {
      var lesson = (b.completedLessons[bC - 1] || {});
      var name = lesson.title || lesson.id || ('Lesson ' + bC);
      setState('celebrate', 3200, 9);
      say(pickLine('lessonComplete').en.replace('🎉', '🎉 ' + name).length ? {
        en: name + ' complete! 🎉',
        bn: name + ' সম্পূর্ণ! 🎉'
      } : pickLine('lessonComplete'), 3400);
      return;
    }
    var aP = a.currentLessonProgress || 0;
    var bP = b.currentLessonProgress || 0;
    if (bP > aP) {
      setState('joy', 1400, 3);
      say(pickLine('progressTick'), 2000);
    }
  }

  function entriesOf(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (Array.isArray(val.log)) return val.log;
    if (Array.isArray(val.entries)) return val.entries;
    return [];
  }

  function onSRSLog(o, n) {
    var aEntries = entriesOf(safeJSON(o));
    var bEntries = entriesOf(safeJSON(n));
    if (bEntries.length <= aEntries.length) return;

    var fresh = bEntries.slice(aEntries.length);
    var last = fresh[fresh.length - 1];
    if (!last) return;
    var grade = last.grade || last.result || last.q;

    if (grade === 'again') {
      correctStreak = 0;
      setState('sad', 1800, 3);
      say(pickLine('srsAgain'), 2200);
    } else if (grade === 'hard') {
      setState('think', 1600, 1);
      say(pickLine('srsHard'), 1800);
    } else if (grade === 'good') {
      correctStreak++;
      setState('joy', 1400, 3);
      if (correctStreak === 3) { setState('wink', 1600, 2); say(pickLine('srsStreak3'), 2000); }
      else if (correctStreak >= 5) { setState('cheer', 1800, 3); say(pickLine('srsStreak5'), 2200); }
    } else if (grade === 'easy') {
      correctStreak++;
      setState('jump', 900, 4);
      say(pickLine('srsEasy'), 1800);
    }

    // session done?
    var today = new Date().toISOString().slice(0, 10);
    var todayEntries = bEntries.filter(function (e) {
      var d = e.date || (e.ts ? new Date(e.ts).toISOString().slice(0, 10) : null);
      return d === today || !d;
    });
    var meta = safeJSON(_nGet.call(localStorage, 'nihongo_srs_meta') || 'null') || {};
    var target = meta.newPerDay || 20;
    if (todayEntries.length === target && todayEntries.length > 0) {
      setState('dance', 2600, 4);
      say(pickLine('srsSessionDone'), 2600);
    }
  }

  function onSRSMeta(o, n) {
    var a = safeJSON(o) || {}, b = safeJSON(n) || {};
    var aS = a.streakCurrent || 0, bS = b.streakCurrent || 0;
    if (bS > aS) {
      if (bS === 7 || bS === 30 || bS === 100) {
        setState('celebrate', 3200, 9);
        say({ en: bS + '-day streak! 🏆', bn: bS + '-দিনের ধারা! 🏆' }, 3200);
      } else {
        setState('jump', 900, 4);
        say({ en: bS + '-day streak! 🔥', bn: bS + '-দিনের ধারা! 🔥' }, 2200);
      }
    } else if (bS === 0 && aS > 0) {
      setState('sad', 1800, 3);
      say(pickLine('streakLost'), 2400);
    }
  }

  function onQuizHistory(o, n) {
    var a = safeJSON(o) || [], b = safeJSON(n) || [];
    if (b.length <= a.length) return;
    var last = b[b.length - 1];
    var total = last.total || 100;
    var prevBest = 0;
    a.forEach(function (r) { if ((r.score || 0) > prevBest) prevBest = r.score || 0; });
    if ((last.score || 0) > prevBest && prevBest > 0) {
      setState('celebrate', 3000, 9);
      say(pickLine('newBest'), 2400);
    } else if ((last.score || 0) === total && total > 0) {
      setState('dance', 2600, 4);
      say(pickLine('perfect'), 2400);
    } else if ((last.score || 0) < total * 0.6) {
      setState('sad', 1800, 3);
      say(pickLine('lowScore'), 2400);
    }
  }

  function onPlacement(o, n) {
    var b = safeJSON(n);
    if (!b) return;
    setState('proud', 3000, 3);
    var lesson = b.recommendedLesson || b.recommendation || b.level;
    if (lesson) {
      say({ en: 'Start at: ' + lesson, bn: 'শুরু করো: ' + lesson }, 3000);
    } else {
      say({ en: 'Placement done!', bn: 'প্লেসমেন্ট শেষ!' }, 2400);
    }
  }

  function onBookmarks(o, n) {
    var a = safeJSON(o) || [], b = safeJSON(n) || [];
    if (b.length > a.length) {
      setState('wink', 1500, 2);
      say(pickLine('bookmarkAdded'), 1600);
    } else if (b.length < a.length) {
      setState('curious', 1500, 1);
      say(pickLine('bookmarkRemoved'), 1600);
    }
  }

  function onLangChange() {
    setState('wave', 1400, 3);
    say(pickLine('langChange'), 1600);
  }

  /* ---------------------------------------------------------
     17. Page-aware + feedback observer
     --------------------------------------------------------- */
  function detectPage() {
    var p = location.pathname.toLowerCase();
    if (/lesson/.test(p)) return 'lesson';
    if (/kanji/.test(p)) return 'kanji';
    if (/search/.test(p)) return 'search';
    if (/progress|dashboard/.test(p)) return 'progress';
    if (/placement/.test(p)) return 'placement';
    if (/auth|login|signin|signup/.test(p)) return 'auth';
    return 'home';
  }

  function installPageBehaviors() {
    var page = detectPage();

    // Correct / wrong feedback in quizzes, flashcards, placement
    var seen = new WeakSet();
    var lastCorrectAt = 0, lastWrongAt = 0;
    var fbObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
        var el = m.target;
        var cls = (typeof el.className === 'string') ? el.className : '';
        if (!cls || seen.has(el)) continue;
        if (/incorrect|wrong|error|is-wrong/i.test(cls)) {
          seen.add(el);
          var nw = performance.now();
          if (nw - lastWrongAt < 900) continue;
          lastWrongAt = nw;
          correctStreak = 0;
          setState('sad', 1600, 3);
          say(pickLine('wrong'), 1800);
        } else if (/correct|right|success|is-correct|is-right/i.test(cls)) {
          seen.add(el);
          var nc = performance.now();
          if (nc - lastCorrectAt < 900) continue;
          lastCorrectAt = nc;
          correctStreak++;
          var fast = lastAnswerAt && (nc - lastAnswerAt < 1600);
          lastAnswerAt = nc;
          if (fast) { setState('jump', 900, 4); say(pickLine('fastCorrect'), 1600); }
          else { setState('joy', 1400, 3); say(pickLine('correct'), 1500); }
          if (correctStreak === 3) setState('wink', 1500, 2);
          if (correctStreak >= 5) setState('cheer', 1800, 3);
          setTimeout(function () {
            if (performance.now() - lastAnswerAt > 3200) correctStreak = 0;
          }, 3300);
        }
      }
    });
    try {
      fbObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    } catch (e) {}

    // Audio play
    document.addEventListener('play', function (e) {
      if (e.target && e.target.tagName === 'AUDIO') {
        setState('joy', 1400, 3);
        say(pickLine('audioPlay'), 1600);
      }
    }, true);

    // Page-specific
    if (page === 'search') {
      var inp = document.querySelector('input[type="search"], input[data-role="search"]');
      if (inp) {
        var st = null;
        inp.addEventListener('input', function () {
          setState('think', 1800, 1);
          clearTimeout(st);
          st = setTimeout(function () {
            var empty = document.querySelector('.no-results, [data-empty="true"], [class*="empty-result"]');
            if (empty) {
              setState('surprised', 1400, 3);
              say(pickLine('noResults'), 1600);
            }
          }, 700);
        });
      }
    }

    if (page === 'progress') {
      setTimeout(function () {
        var heat = document.querySelector('[class*="heatmap"] [class*="active"], [data-heatmap] [data-active="true"]');
        if (heat) { setState('proud', 3000, 3); }
      }, 1200);
    }

    if (page === 'placement') {
      setState('think', 2000, 1);
    }

    if (page === 'auth') {
      var signedIn = !!safeJSON(_nGet.call(localStorage, 'nihongo_user') || 'null');
      setState(signedIn ? 'wave' : 'curious', 1600, 3);
    }
  }

  /* ---------------------------------------------------------
     18. Day greeting + dark mode
     --------------------------------------------------------- */
  function checkDayGreeting() {
    var today = new Date().toISOString().slice(0, 10);
    var last = prefs.lastSeenDay;
    if (last === today) return;

    var daysDiff = 0;
    if (last) {
      try { daysDiff = Math.floor((new Date(today) - new Date(last)) / 86400000); } catch (e) {}
    }
    prefs.lastSeenDay = today;
    savePrefs();

    if (daysDiff >= 3) {
      setState('wave', 2000, 3);
      say(pickLine('welcomeBack'), 2600);
      return;
    }
    var h = new Date().getHours();
    var key = h < 12 ? 'greetMorning' : (h < 18 ? 'greetAfternoon' : 'greetEvening');
    setState('wave', 1800, 3);
    say(pickLine(key), 2400);
  }

  function installDarkModeWatch() {
    if (!window.matchMedia) return;
    var dm = window.matchMedia('(prefers-color-scheme: dark)');
    try {
      dm.addEventListener('change', function (e) {
        setState(e.matches ? 'sleep' : 'wave', 2000, 2);
        say(pickLine(e.matches ? 'darkOn' : 'darkOff'), 2200);
      });
    } catch (e) {}
    if (dm.matches) setState('sleep', 2200, 1);
  }

  /* ---------------------------------------------------------
     19. Mount
     --------------------------------------------------------- */
  var mounted = false;
  var visibilityIO = null;

  function mount() {
    if (mounted) return;
    mounted = true;
    build();
    document.body.appendChild(widget);

    try {
      visibilityIO = new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 });
      visibilityIO.observe(widget);
    } catch (e) { start(); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    installPageBehaviors();
    installDarkModeWatch();
    checkDayGreeting();

    setState('idle', 0, 0);
    start();
  }

  /* ---------------------------------------------------------
     20. Public API
     --------------------------------------------------------- */
  window.Slimo = {
    react: function (event, payload) {
      if (typeof event !== 'string') return;
      var h = {
        lessonComplete:   onProgress,
        progressTick:     onProgress,
        correct:          function () { setState('joy', 1400, 3); },
        wrong:            function () { setState('sad', 1600, 3); },
        fastCorrect:      function () { setState('jump', 900, 4); },
        streakUp:         onSRSMeta,
        streakMilestone:  onSRSMeta,
        celebrate:        function () { setState('celebrate', 3200, 9); spawnConfetti(); },
        dance:            function () { setState('dance', 2400, 4); },
        jump:             function () { setState('jump', 900, 4); },
        wave:             function () { setState('wave', 1600, 3); },
        wink:             function () { setState('wink', 1400, 2); },
        proud:            function () { setState('proud', 2400, 3); },
        surprise:         function () { setState('surprised', 1400, 3); },
        sad:              function () { setState('sad', 1800, 3); }
      };
      if (h[event]) { try { h[event](payload); } catch (e) {} }
    },
    setState: setState,
    say: function (msg, dur) { say(msg, dur); },
    mute: function () { prefs.muted = true; savePrefs(); },
    unmute: function () { prefs.muted = false; savePrefs(); },
    show: function () { if (widget) widget.hidden = false; prefs.enabled = true; savePrefs(); start(); },
    hide: function () { if (widget) widget.hidden = true; prefs.enabled = false; savePrefs(); stop(); },
    // Back-compat alias (old API)
    set: function (name, dur) { setState(name, dur); },
    _state: function () { return currentState; },
    _prefs: function () { return prefs; }
  };

  /* ---------------------------------------------------------
     21. Boot
     --------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
