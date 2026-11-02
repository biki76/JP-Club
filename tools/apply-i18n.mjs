import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ok = ['en', 'vi', 'zh', 'id', 'ko', 'fil', 'ne', 'hi', 'ur'];
const st = {};
for (const [c, m] of Object.entries(P)) {
  if (!ok.includes(c)) { st[c] = 'unknown language'; continue; }
  const p = 'content/i18n/' + c + '.json';
  let j = { strings: {} }; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  j.strings = j.strings || {}; let n = 0, skip = 0;
  for (const [k, v] of Object.entries(m || {})) { if (typeof v === 'string' && v.trim() && v.trim() !== k) { j.strings[k] = v.trim(); n++; } else skip++; }
  fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n'); st[c] = { added: n, skipped: skip };
}
console.log(st);
