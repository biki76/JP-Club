import fs from 'node:fs';
const cache = {};
async function strokesOf(ch) {
  const cp = ch.codePointAt(0).toString(16).padStart(5, '0');
  if (cache[cp] !== undefined) return cache[cp];
  try {
    const r = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${cp}.svg`);
    if (!r.ok) return (cache[cp] = 0);
    const t = await r.text();
    return (cache[cp] = (t.match(/id="kvg:[0-9a-f]+-s\d+"/g) || []).length);
  } catch { return (cache[cp] = 0); }
}
let kFixed = 0, kFail = [], bFixed = 0, files = 0;
for (let i = 1; i <= 50; i++) {
  const dir = `data/lessons/minna-${String(i).padStart(3, '0')}`;
  const kp = `${dir}/kanji.json`, vp = `${dir}/vocabulary.json`;
  if (fs.existsSync(kp)) {
    const k = JSON.parse(fs.readFileSync(kp, 'utf8')); let ch = false;
    for (const e of k) {
      if (!(e.strokes >= 1)) {
        let n = 0;
        for (const c of [...e.character]) n += await strokesOf(c);
        if (n >= 1) { e.strokes = n; kFixed++; ch = true; } else kFail.push(e.character);
      }
    }
    if (ch) { fs.writeFileSync(kp, JSON.stringify(k, null, 2) + '\n'); files++; }
  }
  if (fs.existsSync(vp)) {
    const v = JSON.parse(fs.readFileSync(vp, 'utf8')); let ch = false;
    for (const e of v) {
      if (!e.bengali_meaning || !String(e.bengali_meaning).trim()) { e.bengali_meaning = e.english_meaning; bFixed++; ch = true; }
    }
    if (ch) { fs.writeFileSync(vp, JSON.stringify(v, null, 2) + '\n'); files++; }
  }
}
console.log({ kanjiStrokesFixed: kFixed, kanjiUnresolved: [...new Set(kFail)].join(''), bengaliFallbacks: bFixed, filesWritten: files });
