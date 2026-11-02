import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const st = { reading: 0, listening: 0, rejected: [] };
const good = (q) => q && q.id && q.prompt && Array.isArray(q.options) && q.options.length >= 3 && q.options.length <= 4
  && new Set(q.options.map((o) => JSON.stringify(o))).size === q.options.length && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length;
for (const [kind, file] of [['readingQuestions', 'reading'], ['listeningQuestions', 'listening']]) {
  for (const [slug, qs] of Object.entries(P[kind] || {})) {
    const p = `data/lessons/${slug}/${file}.json`;
    if (!fs.existsSync(p)) { st.rejected.push(p); continue; }
    const bad = (qs || []).filter((q) => !good(q));
    if (bad.length || !qs.length) { st.rejected.push(slug + ' ' + file + ' (' + (bad.length || 'empty') + ')'); continue; }
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    arr[0].questions = qs;
    fs.writeFileSync(p, JSON.stringify(arr, null, 2) + '\n');
    st[file] += qs.length;
  }
}
console.log(st);
