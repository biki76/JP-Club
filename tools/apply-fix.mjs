import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const f = (s, n) => `data/lessons/${s}/${n}.json`;
const rd = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; } };
const wr = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
const st = { gfix: 0, gadd: 0, kanji: 0, padd: 0 };
const byLesson = {};
for (const [id, fix] of Object.entries(P.grammarFix || {})) (byLesson[id.slice(0, 9)] = byLesson[id.slice(0, 9)] || {})[id] = fix;
for (const [s, fixes] of Object.entries(byLesson)) {
  const g = rd(f(s, 'grammar'));
  for (const it of g) {
    const x = fixes[it.id]; if (!x) continue;
    if (x.meaning_bn) it.meaning_bn = x.meaning_bn;
    for (const e of x.examples || []) { let t = it.examples[e.i]; if (!t && e.jp && e.en) { t = { jp: e.jp, en: e.en }; it.examples.push(t); } if (!t) continue; for (const k of ['jp', 'furigana', 'romaji', 'bn']) if (e[k]) t[k] = e[k]; }
    st.gfix++;
  }
  wr(f(s, 'grammar'), g);
}
for (const [s, items] of Object.entries(P.grammarAdd || {})) {
  const g = rd(f(s, 'grammar')); const have = new Set(g.map((x) => x.id));
  for (const it of items) if (!have.has(it.id)) { g.push(it); st.gadd++; }
  wr(f(s, 'grammar'), g);
}
for (const [s, items] of Object.entries(P.practiceAdd || {})) {
  const p = rd(f(s, 'practice')); const have = new Set(p.map((x) => x.id));
  for (const it of items) if (!have.has(it.id)) { p.push(it); st.padd++; }
  wr(f(s, 'practice'), p);
}
async function strokes(ch) {
  try {
    const r = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${ch.codePointAt(0).toString(16).padStart(5, '0')}.svg`);
    if (!r.ok) return 0;
    return ((await r.text()).match(/id="kvg:[0-9a-f]+-s\d+"/g) || []).length;
  } catch { return 0; }
}
for (const [s, items] of Object.entries(P.kanjiReplace || {})) {
  const seen = new Set(), out = [];
  for (const it of items) {
    if (!it.character || seen.has(it.character)) continue;
    const n = await strokes(it.character);
    if (n >= 1) it.strokes = n;
    if (!(it.strokes >= 1)) continue;
    seen.add(it.character); out.push(it);
  }
  if (out.length) { wr(f(s, 'kanji'), out); st.kanji += out.length; }
}
console.log(st);
