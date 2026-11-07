import fs from 'fs';
var h = fs.readFileSync('tutor.html', 'utf8');
var sec = [
'<section class="tv">',
'  <h1><span data-en="Moon · Speaking Partner" data-bn="মুন · স্পিকিং পার্টনার">Moon · Speaking Partner</span></h1>',
'  <p class="tv-sub"><span data-en="Talk in Japanese like a real call. I match your level and pace, and gently correct you." data-bn="সত্যিকারের কলের মতো জাপানিতে কথা বলুন। আমি আপনার লেভেল ও গতির সাথে মিলিয়ে চলব এবং ভুল শুধরে দেব।">Talk in Japanese like a real call. I match your level and pace, and gently correct you.</span></p>',
'  <div class="tv-tabs" role="tablist">',
'    <button type="button" class="tv-tab" role="tab" id="tv-tab-practice" aria-selected="true" aria-controls="tv-panel-practice"><span data-en="Practice" data-bn="অনুশীলন">Practice</span></button>',
'    <button type="button" class="tv-tab" role="tab" id="tv-tab-history" aria-selected="false" aria-controls="tv-panel-history"><span data-en="History" data-bn="ইতিহাস">History</span></button>',
'  </div>',
'  <div class="tv-panel" id="tv-panel-practice" role="tabpanel" aria-labelledby="tv-tab-practice">',
'    <div class="tv-controls">',
'      <label><span data-en="Level" data-bn="লেভেল">Level</span> <select id="tv-level"><option>N5</option><option>N4</option><option>N3</option><option>N2</option><option>N1</option></select></label>',
'      <label><span data-en="Speed" data-bn="গতি">Speed</span> <input type="range" id="tv-rate" min="0.6" max="1.1" step="0.05" value="0.85"></label>',
'      <label><span data-en="Voice" data-bn="কণ্ঠ">Voice</span> <select id="tv-voice"><option>Loading voices...</option></select></label>',
'    </div>',
'    <label class="tv-check"><input type="checkbox" id="tv-barge"> <span data-en="Headphones mode: talk over the tutor (leave off on speakers)" data-bn="হেডফোন মোড: টিউটরের কথার ওপর বলুন (স্পিকারে বন্ধ রাখুন)">Headphones mode: talk over the tutor (leave off on speakers)</span></label>',
'    <h2 class="tv-h"><span data-en="Topic" data-bn="বিষয়">Topic</span></h2>',
'    <div class="tv-topics" id="tv-topics" role="group" aria-label="Topic"></div>',
'    <p class="tv-stats"><span id="tv-today"></span> &middot; <span id="tv-streak"></span></p>',
'    <div class="tv-stage">',
'      <button type="button" id="tv-orb" class="tv-orb" data-state="idle" aria-label="Start talking" data-aria-label-en="Start talking" data-aria-label-bn="কথা বলা শুরু করুন">',
'        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
'      </button>',
'      <p id="tv-status" class="tv-status" aria-live="polite"></p>',
'    </div>',
'    <div class="tv-card"><h2 id="tv-phrases-title"></h2><ul class="tv-phrases" id="tv-phrases"></ul></div>',
'    <div class="tv-card"><h2><span data-en="Survival tips" data-bn="সার্ভাইভাল টিপস">Survival tips</span></h2><ul class="tv-tips" id="tv-tips"></ul></div>',
'  </div>',
'  <div class="tv-panel" id="tv-panel-history" role="tabpanel" aria-labelledby="tv-tab-history" hidden>',
'    <div class="tv-histbox" role="region" aria-labelledby="tv-hist-title">',
'      <div class="tv-histbox-head">',
'        <h2 id="tv-hist-title"><span data-en="Practice history" data-bn="অনুশীলনের ইতিহাস">Practice history</span> <span id="tv-hist-count"></span></h2>',
'        <button type="button" class="tv-btn tv-btn-danger" id="tv-hist-clear" hidden disabled><span data-en="Clear all history" data-bn="সব ইতিহাস মুছুন">Clear all history</span></button>',
'      </div>',
'      <div class="tv-hist" id="tv-hist"></div>',
'    </div>',
'  </div>',
'</section>'
].join('\n');

if (!/<section class="tv">[\s\S]*?<\/section>/.test(h)) { console.log('tutor section not found in tutor.html'); process.exit(1); }
h = h.replace(/<section class="tv">[\s\S]*?<\/section>/, function () { return sec; });

// cache-bust existing assets
h = h.replace(/(css\/tutor-(?:voice|live)\.css|js\/tutor-voice\.js)(\?v=\d+)?/g, '$1?v=6');
// call-status stylesheet (after tutor-live.css so it can refine it)
if (h.indexOf('tutor-call.css') < 0) {
  h = h.replace('</head>', function () { return '  <link rel="stylesheet" href="css/tutor-call.css?v=6">\n</head>'; });
}
// content data script before the engine
if (h.indexOf('tutor-data.js') < 0) {
  if (h.indexOf('<script src="js/tutor-voice.js') < 0) { console.log('tutor-voice.js tag not found'); process.exit(1); }
  h = h.replace('<script src="js/tutor-voice.js', function () { return '<script src="js/tutor-data.js?v=6" defer></script>\n  <script src="js/tutor-voice.js'; });
}
fs.writeFileSync('tutor.html', h);
console.log('tutor.html rebuilt');
