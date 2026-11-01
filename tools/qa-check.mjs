import fs from 'fs';
const pages = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let bad = 0;
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8');
  if (h.includes('css/theme-v2.css') && !h.includes('css/typography-jp.css')) { console.log('MISS typography link:', p); bad++; }
  if (h.includes('cdn.tailwindcss.com')) { console.log('TAILWIND CDN still present:', p); bad++; }
}
const sw = fs.readFileSync('sw.js', 'utf8');
const mine = ['css/typography-jp.css', 'css/toasts.css', 'css/streak-prompt.css', 'css/cmd-palette.css', 'css/perf.css', 'css/kanji-audio.css', 'css/grammar-ref.css', 'css/tracks.css', 'js/toasts.js', 'js/streak-prompt.js', 'js/tabs-memory.js', 'js/cmd-palette.js', 'js/a11y-hooks.js', 'js/kanji-audio.js', 'js/grammar-ref.js', 'js/grammar-ref-link.js', 'js/tracks.js', 'js/search-q.js', 'js/rm-timeout.js', 'grammar.html', 'mimikara.html', 'shinkanzen.html'];
for (const a of mine) if (!sw.includes(a)) { console.log('NOT in sw.js PRECACHE:', a); bad++; }
for (const a of ['icons/icon-192.png', 'icons/icon-512.png', 'og.png', 'content/grammar-ref.json', 'content/mimikara/index.json', 'content/shinkanzen/index.json']) {
  if (!fs.existsSync(a)) { console.log('MISSING asset:', a); bad++; }
}
const gr = JSON.parse(fs.readFileSync('content/grammar-ref.json', 'utf8'));
console.log('grammar points:', gr.length);
console.log(bad === 0 ? 'QA: all checks PASS' : 'QA: ' + bad + ' issue(s)');
