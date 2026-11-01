import fs from 'node:fs';
const out = [];
for (const a of process.argv.slice(2)) {
  const s = 'minna-' + String(+a).padStart(3, '0');
  const p = JSON.parse(fs.readFileSync(`data/lessons/${s}/practice.json`, 'utf8'));
  for (const it of p) {
    if (!it.options.some((o) => /^incorrect$/i.test(o))) continue;
    out.push({ id: it.id, q: it.prompt.en, jp: it.stem.jp, correct: it.options[it.correctIndex], why: (it.explanation || {}).en || '' });
  }
}
console.log(JSON.stringify(out));
