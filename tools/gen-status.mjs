import fs from 'node:fs';
const n = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).length; } catch { return 0; } };
const out = { note: 'Generated from lesson data. Do not edit by hand.', lessons: {} };
const dirs = fs.readdirSync('data/lessons').filter((d) => /^minna-\d{3}$/.test(d)).sort();
for (const s of dirs) {
  const b = `data/lessons/${s}/`;
  const e = { vocab: n(b + 'vocabulary.json'), grammar: n(b + 'grammar.json'), kanji: n(b + 'kanji.json'), practice: n(b + 'practice.json') };
  out.lessons[s] = { status: e.vocab >= 20 && e.grammar >= 3 && e.practice >= 4 ? 'ready' : 'draft', ...e };
}
fs.writeFileSync('data/lessons/status.json', JSON.stringify(out, null, 2) + '\n');
const r = Object.values(out.lessons).filter((x) => x.status === 'ready').length;
console.log(`status.json: ${dirs.length} lessons, ${r} ready`);
