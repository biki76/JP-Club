import fs from 'node:fs';
const errs = [];
const E = (m) => { if (errs.length < 40) errs.push(m); };
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const BN = /[\u0980-\u09FF]/;
function walk(o, p) {
  if (typeof o === 'string') {
    if (!o.trim()) E('empty: ' + p);
    const last = p.split('.').pop().replace(/\[\d+\]$/, '');
    if (/(^|_)bn$/.test(last) && o.trim() && !BN.test(o)) E('bn is not Bengali: ' + p);
  } else if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '[' + i + ']'));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p ? p + '.' + k : k);
}
function questions(items, name) {
  const ids = new Set();
  items.forEach((it, i) => {
    if (!it.id) E(name + '[' + i + '] has no id'); else if (ids.has(it.id)) E('duplicate id ' + it.id); else ids.add(it.id);
    (it.questions || []).forEach((q, k) => {
      const o = q.options;
      if (!Array.isArray(o) || o.length < 3 || o.length > 4 || new Set(o).size !== o.length) E(it.id + ' q' + (k + 1) + ': options must be 3-4 different');
      else if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= o.length) E(it.id + ' q' + (k + 1) + ': bad correctIndex');
      if (!q.prompt || !q.prompt.en || !q.prompt.bn) E(it.id + ' q' + (k + 1) + ': prompt needs en and bn');
    });
  });
}
try {
  const m = rd('content/mimikara/index.json');
  const seen = new Set(); const nums = new Set();
  m.forEach((u, i) => {
    if (!Number.isInteger(u.unit) || nums.has(u.unit)) E('mimikara unit number problem at index ' + i); nums.add(u.unit);
    if (!u.title_en || !u.title_bn) E('mimikara unit ' + u.unit + ' needs title_en and title_bn');
    if (!Array.isArray(u.words) || !u.words.length) E('mimikara unit ' + u.unit + ' has no words');
    (u.words || []).forEach((w, k) => {
      for (const f of ['jp', 'reading', 'en', 'bn']) if (!w[f] || !String(w[f]).trim()) E('mimikara unit ' + u.unit + ' word ' + (k + 1) + ' missing ' + f);
      const key = w.jp + '|' + w.reading; if (seen.has(key)) E('duplicate word ' + key); seen.add(key);
    });
  });
  walk(m, 'mimikara');
  const s = rd('content/shinkanzen/index.json');
  const gid = new Set();
  (s.grammar || []).forEach((g, i) => {
    if (!g.id || gid.has(g.id)) E('grammar id problem at ' + i); gid.add(g.id);
    if (!g.pattern || !g.meaning || !g.meaning.en || !g.meaning.bn) E((g.id || i) + ': pattern and meaning en/bn needed');
    if (!Array.isArray(g.examples) || g.examples.length < 3) E((g.id || i) + ': needs 3 examples');
    (g.examples || []).forEach((e, k) => { for (const f of ['jp', 'furigana', 'romaji', 'en', 'bn']) if (!e[f] || !String(e[f]).trim()) E((g.id || i) + ' example ' + (k + 1) + ' missing ' + f); });
  });
  questions(s.reading || [], 'reading'); questions(s.listening || [], 'listening');
  walk(s, 'shinkanzen');
  console.log('counts:', { mimikaraUnits: m.length, mimikaraWords: seen.size, grammar: (s.grammar || []).length, reading: (s.reading || []).length, listening: (s.listening || []).length });
} catch (e) { E('cannot read content files: ' + e.message); }
if (errs.length) { console.log('TRACKS FAIL'); errs.forEach((x) => console.log(' - ' + x)); process.exitCode = 1; } else console.log('TRACKS PASS ✓');
