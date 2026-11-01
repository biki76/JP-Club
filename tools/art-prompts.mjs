import fs from 'node:fs';
const STYLE = 'Kawaii flat vector educational illustration, Japanese textbook style, clean thick dark-brown outlines, soft warm pastel colors, simple friendly characters with rounded faces, flat shading, cheerful classroom mood, no gradients, no photo realism, 5:3 landscape. Characters: a smiling female teacher in an orange cardigan and two cheerful children at wooden desks. Do not add any text except what is specified.';
const out = [];
for (let i = 1; i <= 50; i++) {
  const s = 'minna-' + String(i).padStart(3, '0'), b = 'data/lessons/' + s + '/';
  let t = {}, p = '';
  try { t = JSON.parse(fs.readFileSync(b + 'manifest.json', 'utf8')).title; } catch {}
  try { p = JSON.parse(fs.readFileSync(b + 'grammar.json', 'utf8'))[0].pattern; } catch {}
  out.push(`### ${String(i).padStart(2, '0')}  (save as ${String(i).padStart(2, '0')}.png)\n${STYLE} Scene for the lesson topic "${t.en || 'Lesson ' + i}": show the teacher and students acting out this topic. A green blackboard or sign shows the Japanese pattern "${p}" in large clear handwritten-style letters. Lesson number 第${i}課 in a small corner label.\n`);
}
const T = { beginner: 'a stack of beginner textbooks with N5 on the cover', intermediate: 'a stack of textbooks with N4 on the cover', temabetsu: 'a teacher holding a reading booklet with short essays', mimikara: 'a teacher holding vocabulary flash cards', shinkanzen: 'a teacher with a JLPT exam sheet and a pencil', kanji: 'a teacher at a blackboard writing a large kanji with stroke arrows', default: 'a teacher holding an open textbook' };
for (const [k, v] of Object.entries(T)) out.push(`### TRACK ${k}  (save as t-${k}.png)\n${STYLE} Square 1:1 composition: ${v}.\n`);
fs.writeFileSync('art-prompts/prompts.md', out.join('\n'));
console.log('prompts written:', out.length);
