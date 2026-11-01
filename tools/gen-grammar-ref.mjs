import fs from 'fs';
import path from 'path';
const root = 'content/lessons';
const out = [];
if (fs.existsSync(root)) {
  for (const d of fs.readdirSync(root).sort()) {
    const p = path.join(root, d, 'lesson.json');
    if (!fs.existsSync(p)) continue;
    let j; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { continue; }
    const gs = j.grammar || j.grammar_points || [];
    gs.forEach(function (g) {
      const ex = (g.examples && g.examples[0]) || g.example || null;
      out.push({
        lesson: (j.lesson || j.id || d.replace(/\D/g, '') || d),
        jp: g.jp || g.ja || g.pattern || g.title || '',
        romaji: g.romaji || '',
        en: g.en || g.meaning || g.title_en || '',
        bn: g.bn || '',
        example: typeof ex === 'string' ? ex : (ex ? (ex.jp || ex.ja || '') : '')
      });
    });
  }
}
fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/grammar-ref.json', JSON.stringify(out, null, 1));
console.log('grammar points:', out.length);
