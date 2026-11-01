import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const by = {};
for (const [id, fx] of Object.entries(P.practiceFix || {})) { const s = id.slice(0, 9); if (!by[s]) by[s] = {}; by[s][id] = fx; }
let ok = 0; const bad = [];
for (const [s, m] of Object.entries(by)) {
  const f = `data/lessons/${s}/practice.json`;
  const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const it of arr) {
    const fx = m[it.id]; if (!fx) continue;
    const o = fx.options;
    if (!Array.isArray(o) || o.length < 3 || o.length > 4 || new Set(o).size !== o.length || o.some((x) => !x || /^incorrect$/i.test(x)) || !(fx.correctIndex >= 0 && fx.correctIndex < o.length)) { bad.push(it.id); continue; }
    it.options = o; it.correctIndex = fx.correctIndex;
    if (fx.stem) for (const k of ['furigana', 'romaji']) if (fx.stem[k]) it.stem[k] = fx.stem[k];
    ok++;
  }
  fs.writeFileSync(f, JSON.stringify(arr, null, 2) + '\n');
}
console.log({ fixed: ok, rejected: bad });
