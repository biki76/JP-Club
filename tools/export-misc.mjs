import fs from 'node:fs';
const rd = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; } };
const S = (i) => 'minna-' + String(i).padStart(3, '0');
const titles = [];
for (let i = 1; i <= 25; i++) {
  const b = `data/lessons/${S(i)}/`; const v = rd(b + 'vocabulary.json'), g = rd(b + 'grammar.json');
  titles.push({ lesson: S(i), vocabCount: v.length, sampleVocab: v.slice(0, 10).map((x) => x.english_meaning), grammarPatterns: g.map((x) => x.pattern),
    ...([24, 25].includes(i) ? { allVocab: v.map((x) => x.furigana + '=' + x.english_meaning), lastVocabId: v[v.length - 1].id } : {}) });
}
const fix = [1, 2].map((i) => {
  const g = rd(`data/lessons/${S(i)}/grammar.json`);
  return { lesson: S(i), grammar: g.map((x) => ({ id: x.id, pattern: x.pattern, meaning_bn: x.meaning_bn, examples: (x.examples || []).map((e, j) => ({ i: j, jp: e.jp, en: e.en })) })) };
});
console.log(JSON.stringify({ titles, fix }));
