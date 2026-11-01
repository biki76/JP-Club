import fs from 'node:fs';
const D = '〇一二三四五六七八九';
const kn = (n) => n < 10 ? D[n] : n === 10 ? '十' : n < 20 ? '十' + D[n - 10] : D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '');
const BG = ['#FFD6A5', '#CDEAC0', '#BDE0FE', '#FFC8DD', '#E4C1F9', '#FDFFB6'];
const AC = ['#F4A261', '#7FB77E', '#5BA4E6', '#E56B9A', '#A66FD6', '#E0C341'];
const INK = '#3b2f2a';
const S = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const star = (() => { let p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 26 : 60, a = -Math.PI / 2 + i * Math.PI / 5; p.push((200 + r * Math.cos(a)).toFixed(1) + ',' + (278 + r * Math.sin(a)).toFixed(1)); } return p.join(' '); })();
const M = {
  clock: (a) => `<circle cx="200" cy="275" r="60" fill="#fff" ${S}/><path d="M200 275V235M200 275L228 290" fill="none" ${S}/>`,
  pin: (a) => `<path d="M200 335C200 335 150 285 150 250A50 50 0 0 1 250 250C250 285 200 335 200 335Z" fill="#fff" ${S}/><circle cx="200" cy="250" r="16" fill="${a}" ${S}/>`,
  book: (a) => `<rect x="138" y="232" width="62" height="92" rx="6" fill="#fff" ${S}/><rect x="200" y="232" width="62" height="92" rx="6" fill="${a}" ${S}/>`,
  bag: (a) => `<rect x="150" y="248" width="100" height="80" rx="10" fill="${a}" ${S}/><path d="M175 248V232A25 25 0 0 1 225 232V248" fill="none" ${S}/>`,
  train: (a) => `<rect x="140" y="232" width="120" height="78" rx="14" fill="#fff" ${S}/><rect x="155" y="248" width="34" height="26" rx="4" fill="${a}" ${S}/><rect x="211" y="248" width="34" height="26" rx="4" fill="${a}" ${S}/><circle cx="170" cy="324" r="9" fill="#fff" ${S}/><circle cx="230" cy="324" r="9" fill="#fff" ${S}/>`,
  bowl: (a) => `<path d="M140 275H260A60 58 0 0 1 140 275Z" fill="${a}" ${S}/><path d="M172 255Q162 240 172 226M200 255Q190 240 200 226M228 255Q218 240 228 226" fill="none" ${S}/>`,
  chat: (a) => `<path d="M140 232H260A12 12 0 0 1 272 244V290A12 12 0 0 1 260 302H205L172 332V302H140A12 12 0 0 1 128 290V244A12 12 0 0 1 140 232Z" fill="#fff" ${S}/><circle cx="170" cy="267" r="6" fill="${a}"/><circle cx="200" cy="267" r="6" fill="${a}"/><circle cx="230" cy="267" r="6" fill="${a}"/>`,
  calendar: (a) => `<rect x="140" y="236" width="120" height="96" rx="10" fill="#fff" ${S}/><path d="M140 266H260" fill="none" ${S}/><rect x="140" y="236" width="120" height="30" rx="10" fill="${a}" ${S}/><circle cx="172" cy="296" r="5" fill="${INK}"/><circle cx="200" cy="296" r="5" fill="${INK}"/><circle cx="228" cy="296" r="5" fill="${INK}"/><circle cx="172" cy="316" r="5" fill="${INK}"/><circle cx="200" cy="316" r="5" fill="${INK}"/>`,
  heart: (a) => `<path d="M200 335C150 298 135 268 135 248A32 32 0 0 1 200 242A32 32 0 0 1 265 248C265 268 250 298 200 335Z" fill="${a}" ${S}/>`,
  star: (a) => `<polygon points="${star}" fill="${a}" ${S}/>`
};
const pick = (t) => {
  t = t.toLowerCase();
  if (/time|daily|routine|duration|deadline/.test(t)) return 'clock';
  if (/date|season|count|habit/.test(t)) return 'calendar';
  if (/going|coming|travel|direction|transport/.test(t)) return 'train';
  if (/place|where|existence|position/.test(t)) return 'pin';
  if (/shop|buy|tool|giving|receiv|favour|help/.test(t)) return 'bag';
  if (/like|hobb|want|purpose|skill|ability|abilit|wish/.test(t)) return 'heart';
  if (/opinion|quot|speech|casual|advice|reason|polite|keigo|invit/.test(t)) return 'chat';
  if (/food|eat|meal/.test(t)) return 'bowl';
  if (/describ|adject|condition|state|result|change|experience/.test(t)) return 'star';
  return 'book';
};
let n = 0;
for (let i = 1; i <= 50; i++) {
  const s = 'minna-' + String(i).padStart(3, '0');
  let t = '';
  try { t = JSON.parse(fs.readFileSync(`data/lessons/${s}/manifest.json`, 'utf8')).title.en; } catch {}
  const k = pick(t), bg = BG[(i - 1) % 6], ac = AC[(i - 1) % 6];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Lesson ${i}"><rect width="400" height="240" rx="18" fill="${bg}"/><text x="200" y="96" text-anchor="middle" font-size="68" font-weight="700" font-family="Noto Sans JP, Hiragino Sans, sans-serif" fill="${INK}">第${kn(i)}課</text><text x="200" y="128" text-anchor="middle" font-size="20" font-weight="600" font-family="Inter, sans-serif" fill="${INK}" opacity=".7">Lesson ${i}</text><g transform="translate(200 188) scale(.52) translate(-200 -278)">${M[k](ac)}</g></svg>`;
  fs.writeFileSync(`images/lessons/${s}.svg`, svg); n++;
}
console.log('covers written:', n);
