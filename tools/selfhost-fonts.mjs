import fs from 'node:fs';
import path from 'node:path';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map(m => m[1]))];
console.log('font files:', urls.length);

const map = new Map();
let i = 0;
for (const u of urls) {
  const name = 'f' + String(++i).padStart(3, '0') + '.woff2';
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.error('FAIL', u); continue; }
  fs.writeFileSync(path.join('fonts', name), Buffer.from(await res.arrayBuffer()));
  map.set(u, name);
  if (i % 20 === 0) console.log(i + '/' + urls.length);
}

let out = css;
for (const [u, n] of map) out = out.split(u).join('../fonts/' + n);
fs.writeFileSync('css/fonts.css', out);

let patched = 0;
for (const f of fs.readdirSync('.').filter(x => x.endsWith('.html'))) {
  let h = fs.readFileSync(f, 'utf8');
  if (h.includes('css/fonts.css')) continue;
  const n = h
    .replace(/<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2[^"]*"[^>]*>/g, '<link rel="stylesheet" href="css/fonts.css">')
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g, '');
  if (n !== h) { fs.writeFileSync(f, n); patched++; }
}
console.log('pages patched:', patched);
