import fs from 'node:fs';
const rd = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; } };
const sig = {}, rows = [];
for (let i = 3; i <= 25; i++) {
  const s = 'minna-' + String(i).padStart(3, '0'), b = `data/lessons/${s}/`;
  const g = rd(b + 'grammar.json'), k = rd(b + 'kanji.json'), p = rd(b + 'practice.json');
  let ex = 0, badBn = 0, noRom = 0;
  for (const x of g) for (const e of x.examples || []) { ex++; if (!e.bn || e.bn === e.en) badBn++; if (!e.romaji) noRom++; }
  const ks = k.map((x) => x.character).sort().join('');
  (sig[ks] = sig[ks] || []).push(i);
  rows.push({ lesson: i, grammar: g.length, examples: ex, bnBad: badBn, romajiMissing: noRom, kanji: k.length, practice: p.length, ks });
}
for (const r of rows) {
  r.kanjiDup = sig[r.ks].length >= 3 ? 'PLACEHOLDER' : '';
  delete r.ks;
}
console.table(rows);
