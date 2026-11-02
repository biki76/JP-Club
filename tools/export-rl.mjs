import fs from 'node:fs';
const rd = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; } };
const out = [];
for (const a of process.argv.slice(2)) {
  const s = 'minna-' + String(+a).padStart(3, '0'), b = `data/lessons/${s}/`;
  const m = rd(b + 'manifest.json'), r = (rd(b + 'reading.json')[0]) || {}, l = (rd(b + 'listening.json')[0]) || {};
  out.push({
    lesson: s, jlpt: m.jlpt,
    reading: { id: r.id, title: (r.title || {}).en, text: (r.passage || []).map((x) => x.jp + ' | ' + x.en) },
    listening: { id: l.id, title: (l.title || {}).en, text: (l.transcript || []).map((x) => x.jp + ' | ' + x.en) }
  });
}
console.log(JSON.stringify(out));
