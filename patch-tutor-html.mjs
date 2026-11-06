import fs from 'fs';
let h = fs.readFileSync('tutor.html', 'utf8');
if (h.includes('tv-topics')) { console.log('already patched'); process.exit(0); }
const add = `<div class="tv-topics" role="group" aria-label="Topic">
          <button class="tv-topic" data-topic="free" aria-pressed="true"><span data-en="Free talk" data-bn="ফ্রি আলাপ">Free talk</span></button>
          <button class="tv-topic" data-topic="intro" aria-pressed="false"><span data-en="Introductions" data-bn="পরিচয়">Introductions</span></button>
          <button class="tv-topic" data-topic="food" aria-pressed="false"><span data-en="Food" data-bn="খাবার">Food</span></button>
          <button class="tv-topic" data-topic="travel" aria-pressed="false"><span data-en="Travel" data-bn="ভ্রমণ">Travel</span></button>
          <button class="tv-topic" data-topic="shop" aria-pressed="false"><span data-en="Shopping" data-bn="কেনাকাটা">Shopping</span></button>
        </div>
        <p class="tv-stats"><span id="tv-today"></span> &middot; <span id="tv-streak"></span></p>
        `;
if (!h.includes('<div class="tv-stage">')) { console.log('stage not found'); process.exit(1); }
h = h.replace('<div class="tv-stage">', () => add + '<div class="tv-stage">');
fs.writeFileSync('tutor.html', h);
console.log('tutor.html patched');
