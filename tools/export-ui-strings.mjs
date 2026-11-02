import fs from 'node:fs';
const set = new Set();
const add = (s) => { s = String(s || '').replace(/\\(['"])/g, '$1').replace(/\s+/g, ' ').trim(); if (s.length > 1 && /[A-Za-z]/.test(s) && !/\$\{|<\/?[a-z]/i.test(s) && !/'\s*\+|\+\s*'|dataset|esc\(|\.en\b|\bel\.|\bvar\b/.test(s)) set.add(s); };
const files = [...fs.readdirSync('.').filter((f) => f.endsWith('.html')), ...fs.readdirSync('js').filter((f) => f.endsWith('.js') && !/^(data-|supabase|ui-lang)/.test(f)).map((f) => 'js/' + f)];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/data-(?:placeholder-|aria-label-)?en="([^"]+)"/g)) add(m[1]);
  for (const m of t.matchAll(/\btxt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) add(m[2]);
  for (const m of t.matchAll(/\ben:\s*(['"])((?:\\.|(?!\1).)*)\1/g)) add(m[2]);
}
const have = new Set();
try { for (const c of ['vi', 'zh', 'id', 'ko', 'fil', 'ne', 'hi', 'ur']) { const j = JSON.parse(fs.readFileSync('content/i18n/' + c + '.json', 'utf8')); const k = Object.keys(j.strings || {}); k.forEach((x) => have.add(c + '|' + x)); } } catch {}
const all = [...set].sort();
const todo = all.filter((s) => ['vi', 'zh', 'id', 'ko', 'fil', 'ne', 'hi', 'ur'].some((c) => !have.has(c + '|' + s)));
const N = 50;
const out = process.env.HOME;
for (let i = 0; i * N < todo.length; i++) fs.writeFileSync(out + '/ui-batch-' + (i + 1) + '.json', JSON.stringify(todo.slice(i * N, (i + 1) * N)));
console.log({ uniqueStrings: all.length, stillToTranslate: todo.length, batches: Math.ceil(todo.length / N) });
