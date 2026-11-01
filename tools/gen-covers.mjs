import fs from 'node:fs';
const D = '〇一二三四五六七八九';
const kn = (n) => n < 10 ? D[n] : n === 10 ? '十' : n < 20 ? '十' + D[n - 10] : D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BG = ['#FFD6A5', '#CDEAC0', '#BDE0FE', '#FFC8DD', '#E4C1F9', '#FDFFB6'];
const SHIRT = ['#F4A261', '#5E9E6B', '#4F8FDB', '#D6578C', '#8F5FC4', '#D9B73A'];
const INK = '#3b2f2a', SKIN = '#FFE0C2', HAIR = '#4a3426';
const FONT = 'Noto Sans JP, Hiragino Sans, Yu Gothic, sans-serif';
const char = (shirt, bun, book) => `
<path d="M-52 96Q-52 30 0 30Q52 30 52 96Z" fill="${shirt}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<circle r="36" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>
${bun ? `<circle cx="0" cy="-46" r="13" fill="${HAIR}" stroke="${INK}" stroke-width="4"/>` : ''}
<path d="M-37 -2Q-40 -44 0 -44Q40 -44 37 -2Q22 -26 -4 -24Q-26 -22 -37 -2Z" fill="${HAIR}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="-13" cy="4" r="3.6" fill="${INK}"/><circle cx="13" cy="4" r="3.6" fill="${INK}"/>
<circle cx="-22" cy="14" r="6" fill="#FF9E8A" opacity=".55"/><circle cx="22" cy="14" r="6" fill="#FF9E8A" opacity=".55"/>
<path d="M-10 16Q0 25 10 16" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
${book ? `<rect x="-34" y="52" width="68" height="40" rx="6" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M0 52V92" stroke="${INK}" stroke-width="3"/><circle cx="-38" cy="74" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="4"/><circle cx="38" cy="74" r="8" fill="${SKIN}" stroke="${INK}" stroke-width="4"/>` : ''}`;
let n = 0;
for (let i = 1; i <= 50; i++) {
  const s = 'minna-' + String(i).padStart(3, '0');
  let pat = '';
  try { pat = JSON.parse(fs.readFileSync(`data/lessons/${s}/grammar.json`, 'utf8'))[0].pattern; } catch {}
  pat = [...String(pat).replace(/\s+/g, ' ')].slice(0, 11).join('');
  const bg = BG[(i - 1) % 6], sh = SHIRT[(i - 1) % 6];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Lesson ${i}"><defs><clipPath id="c"><rect width="400" height="240" rx="18"/></clipPath></defs><g clip-path="url(#c)"><rect width="400" height="240" fill="${bg}"/><circle cx="360" cy="40" r="70" fill="#fff" opacity=".25"/>
<text x="26" y="82" font-size="54" font-weight="700" font-family="${FONT}" fill="${INK}">第${kn(i)}課</text>
<text x="28" y="112" font-size="18" font-weight="600" font-family="Inter, sans-serif" fill="${INK}" opacity=".7">Lesson ${i}</text>
<rect x="26" y="146" width="206" height="66" rx="12" fill="#fff" stroke="${INK}" stroke-width="4"/>
<text x="129" y="188" text-anchor="middle" font-size="${pat.length > 8 ? 20 : 26}" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(pat)}</text>
<g transform="translate(320 150)">${char(sh, i % 2 === 0, true)}</g></g></svg>`;
  fs.writeFileSync(`images/lessons/${s}.svg`, svg); n++;
}
const T = { beginner: ['N5', '#FFD6A5', '#F4A261'], intermediate: ['N4', '#BDE0FE', '#4F8FDB'], temabetsu: ['読', '#FFC8DD', '#D6578C'], mimikara: ['語', '#E4C1F9', '#8F5FC4'], shinkanzen: ['文', '#CDEAC0', '#5E9E6B'], kanji: ['字', '#FDFFB6', '#D9B73A'], default: ['本', '#CDEAC0', '#5E9E6B'] };
for (const [k, [t, bg, sh]] of Object.entries(T)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${k}"><defs><clipPath id="c"><rect width="160" height="160" rx="22"/></clipPath></defs><g clip-path="url(#c)"><rect width="160" height="160" fill="${bg}"/><text x="14" y="52" font-size="${t.length > 1 ? 30 : 44}" font-weight="800" font-family="${FONT}" fill="${INK}">${t}</text><g transform="translate(104 100) scale(.78)">${char(sh, k === 'mimikara' || k === 'kanji', true)}</g></g></svg>`;
  fs.writeFileSync(`images/tracks/${k}.svg`, svg); n++;
}
console.log('images written:', n);
