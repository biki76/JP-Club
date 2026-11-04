import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const MP = 'content/mimikara/index.json', SP = 'content/shinkanzen/index.json';
const oldM = fs.readFileSync(MP, 'utf8'), oldS = fs.readFileSync(SP, 'utf8');
const m = JSON.parse(oldM), s = JSON.parse(oldS);
let w = 0, g = 0, r = 0, l = 0;
for (const u of P.mimikara || []) {
  let t = m.find((x) => x.unit === u.unit);
  if (!t) { t = { unit: u.unit, title_en: u.title_en, title_bn: u.title_bn, words: [] }; m.push(t); }
  const have = new Set(t.words.map((x) => x.jp + '|' + x.reading));
  for (const x of u.words || []) { const k = x.jp + '|' + x.reading; if (!have.has(k)) { t.words.push(x); have.add(k); w++; } }
}
m.sort((a, b) => a.unit - b.unit);
const add = (key, items) => { s[key] = s[key] || []; const ids = new Set(s[key].map((x) => x.id)); let n = 0; for (const x of items || []) if (!ids.has(x.id)) { s[key].push(x); ids.add(x.id); n++; } return n; };
const S = P.shinkanzen || {};
g = add('grammar', S.grammar); r = add('reading', S.reading); l = add('listening', S.listening);
fs.writeFileSync(MP, JSON.stringify(m, null, 2) + '\n'); fs.writeFileSync(SP, JSON.stringify(s, null, 2) + '\n');
const v = spawnSync('node', ['tools/validate-tracks.mjs'], { encoding: 'utf8' });
console.log(v.stdout.trim());
if (v.status !== 0) { fs.writeFileSync(MP, oldM); fs.writeFileSync(SP, oldS); console.log('REJECTED: old files restored, nothing was added.'); }
else console.log({ wordsAdded: w, grammarAdded: g, readingAdded: r, listeningAdded: l });
