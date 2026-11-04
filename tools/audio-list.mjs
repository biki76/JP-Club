import fs from 'node:fs';
const from = +process.argv[2] || 1, to = +process.argv[3] || 5;
const rows = ['file\ttext\tmeaning'];
for (let i = from; i <= to; i++) {
  const s = 'minna-' + String(i).padStart(3, '0'), b = `data/lessons/${s}/`;
  let v = [], l = [];
  try { v = JSON.parse(fs.readFileSync(b + 'vocabulary.json', 'utf8')); } catch {}
  try { l = (JSON.parse(fs.readFileSync(b + 'listening.json', 'utf8'))[0] || {}).transcript || []; } catch {}
  v.forEach((x) => rows.push(`audio/${s}/${x.id.split('-').pop()}.mp3\t${x.furigana}\t${x.english_meaning}`));
  l.forEach((x, k) => rows.push(`audio/${s}/l${String(k + 1).padStart(3, '0')}.mp3\t${x.jp}\t${x.en}`));
}
fs.writeFileSync(process.env.HOME + '/record-list.tsv', rows.join('\n') + '\n');
console.log('items to record:', rows.length - 1, '-> ~/record-list.tsv');
