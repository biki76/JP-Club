import fs from 'node:fs';
let nv = 0, nl = 0;
for (let i = 1; i <= 50; i++) {
  const s = 'minna-' + String(i).padStart(3, '0'), d = `audio/${s}/`, b = `data/lessons/${s}/`;
  if (!fs.existsSync(d)) continue;
  const vp = b + 'vocabulary.json', lp = b + 'listening.json';
  try {
    const v = JSON.parse(fs.readFileSync(vp, 'utf8')); let ch = false;
    for (const x of v) { const f = d + x.id.split('-').pop() + '.mp3'; if (fs.existsSync(f) && x.audio_url !== f) { x.audio_url = f; nv++; ch = true; } }
    if (ch) fs.writeFileSync(vp, JSON.stringify(v, null, 2) + '\n');
  } catch {}
  try {
    const l = JSON.parse(fs.readFileSync(lp, 'utf8')); let ch = false;
    (l[0].transcript || []).forEach((x, k) => { const f = d + 'l' + String(k + 1).padStart(3, '0') + '.mp3'; if (fs.existsSync(f) && x.audio_url !== f) { x.audio_url = f; nl++; ch = true; } });
    if (ch) fs.writeFileSync(lp, JSON.stringify(l, null, 2) + '\n');
  } catch {}
}
console.log({ vocabLinked: nv, listeningLinked: nl });
