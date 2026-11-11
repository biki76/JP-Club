import fs from 'fs';
var h = fs.readFileSync('tutor.html', 'utf8');
if (h.indexOf('tv-tab-history') >= 0) { console.log('already patched'); process.exit(0); }
var s = [
'<section class="tv">',
'  <h1><span data-en="Speaking Partner" data-bn="স্পিকিং পার্টনার">Speaking Partner</span></h1>',
'  <p class="tv-sub"><span data-en="Talk in Japanese like a real call. I match your level and pace, and gently correct you." data-bn="সত্যিকারের কলের মতো জাপানিতে কথা বলুন। আমি আপনার লেভেল ও গতির সাথে মিলিয়ে চলব এবং ভুল শুধরে দেব।">Talk in Japanese like a real call. I match your level and pace, and gently correct you.</span></p>',
'  <div class="tv-tabs" role="tablist">',
'    <button type="button" class="tv-tab" role="tab" id="tv-tab-practice" aria-selected="true" aria-controls="tv-panel-practice"><span data-en="Practice" data-bn="অনুশীলন">Practice</span></button>',
'    <button type="button" class="tv-tab" role="tab" id="tv-tab-history" aria-selected="false" aria-controls="tv-panel-history"><span data-en="History" data-bn="ইতিহাস">History</span></button>',
'  </div>',
'  <div class="tv-panel" id="tv-panel-practice" role="tabpanel" aria-labelledby="tv-tab-practice">',
'    <div class="tv-controls">',
'      <label><span data-en="Level" data-bn="লেভেল">Level</span> <select id="tv-level"><option>N5</option><option>N4</option><option>N3</option><option>N2</option><option>N1</option></select></label>',
'      <label><span data-en="Speed" data-bn="গতি">Speed</span> <input type="range" id="tv-rate" min="0.6" max="1.1" step="0.05" value="0.85"></label>',
'      <label><span data-en="Voice" data-bn="কণ্ঠ">Voice</span> <select id="tv-voice"></select></label>',
'    </div>',
'    <label class="tv-check"><input type="checkbox" id="tv-barge" checked> <span data-en="Interrupt by voice (best with headphones)" data-bn="কথা বলে থামান (হেডফোনে ভালো)">Interrupt by voice (best with headphones)</span></label>',
'    <div class="tv-topics" role="group" aria-label="Topic">',
'      <button type="button" class="tv-topic" data-topic="free" aria-pressed="true"><span data-en="Free talk" data-bn="ফ্রি আলাপ">Free talk</span></button>',
'      <button type="button" class="tv-topic" data-topic="intro" aria-pressed="false"><span data-en="Introductions" data-bn="পরিচয়">Introductions</span></button>',
'      <button type="button" class="tv-topic" data-topic="food" aria-pressed="false"><span data-en="Food" data-bn="খাবার">Food</span></button>',
'      <button type="button" class="tv-topic" data-topic="travel" aria-pressed="false"><span data-en="Travel" data-bn="ভ্রমণ">Travel</span></button>',
'      <button type="button" class="tv-topic" data-topic="shop" aria-pressed="false"><span data-en="Shopping" data-bn="কেনাকাটা">Shopping</span></button>',
'    </div>',
'    <p class="tv-stats"><span id="tv-today"></span> &middot; <span id="tv-streak"></span></p>',
'    <div class="tv-stage">',
'      <button type="button" id="tv-orb" class="tv-orb" data-state="idle" aria-label="Start talking" data-aria-label-en="Start talking" data-aria-label-bn="কথা বলা শুরু করুন">',
'        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
'      </button>',
'      <p id="tv-status" class="tv-status" aria-live="polite"></p>',
'    </div>',
'  </div>',
'  <div class="tv-panel" id="tv-panel-history" role="tabpanel" aria-labelledby="tv-tab-history" hidden>',
'    <div class="tv-hist-head"><button type="button" class="tv-btn" id="tv-hist-clear"><span data-en="Clear all" data-bn="সব মুছুন">Clear all</span></button></div>',
'    <div class="tv-hist" id="tv-hist"></div>',
'  </div>',
'</section>'
].join('\n');
if (!/<section class="tv">[\s\S]*?<\/section>/.test(h)) { console.log('section not found'); process.exit(1); }
h = h.replace(/<section class="tv">[\s\S]*?<\/section>/, function () { return s; });
h = h.replace(/(css\/tutor-(?:voice|live)\.css|js\/tutor-voice\.js)(\?v=\d+)?/g, '$1?v=4');
fs.writeFileSync('tutor.html', h);
console.log('tutor.html patched');
