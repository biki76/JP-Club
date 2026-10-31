import fs from 'node:fs';
const rd = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; } };
const sig = {};
for (let i = 3; i <= 25; i++) {
  const k = rd(`data/lessons/minna-${String(i).padStart(3, '0')}/kanji.json`).map((x) => x.character).sort().join('');
  (sig[k] = sig[k] || []).push(i);
}
const out = [];
for (const a of process.argv.slice(2)) {
  const i = +a, s = 'minna-' + String(i).padStart(3, '0'), b = `data/lessons/${s}/`;
  const g = rd(b + 'grammar.json'), k = rd(b + 'kanji.json'), p = rd(b + 'practice.json'), v = rd(b + 'vocabulary.json');
  const ks = k.map((x) => x.character).sort().join('');
  out.push({
    lesson: s,
    needNewKanji: k.length < 6 || sig[ks].length >= 3,
    needMoreGrammar: g.length < 3,
    needMorePractice: p.length < 6,
    existingGrammarIds: g.map((x) => x.id),
    existingPracticeCount: p.length,
    grammar: g.map((x) => ({ id: x.id, pattern: x.pattern, meaning_bn: x.meaning_bn, examples: (x.examples || []).map((e, j) => ({ i: j, jp: e.jp, en: e.en })) })),
    vocabWithKanji: v.filter((x) => x.kanji && /[\u4e00-\u9fff]/.test(x.kanji)).slice(0, 40).map((x) => x.kanji + '=' + x.english_meaning)
  });
}
console.log(JSON.stringify(out));
