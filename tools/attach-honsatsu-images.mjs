import fs from 'node:fs';
import path from 'node:path';

const srcDir = process.argv[2];
const outDir = path.join('images', 'honsatsu');
fs.mkdirSync(outDir, { recursive: true });
const IMG = /\.(png|jpe?g|webp)$/i;

if (srcDir) {
  if (!fs.existsSync(srcDir)) { console.error('Folder not found: ' + srcDir); process.exit(1); }
  let copied = 0;
  for (const f of fs.readdirSync(srcDir)) {
    if (!IMG.test(f)) continue;
    const m = f.replace(IMG, '').match(/(\d{1,3})(?!.*\d)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n < 1 || n > 87) { console.warn('skip (no track 1-87): ' + f); continue; }
    const ext = path.extname(f).toLowerCase().replace('.jpeg', '.jpg');
    for (const old of fs.readdirSync(outDir)) {
      if (old.startsWith(String(n).padStart(2, '0') + '.')) fs.unlinkSync(path.join(outDir, old));
    }
    fs.copyFileSync(path.join(srcDir, f), path.join(outDir, String(n).padStart(2, '0') + ext));
    copied++;
  }
  console.log('Copied ' + copied + ' image(s) to ' + outDir);
}

const have = {};
for (const f of fs.readdirSync(outDir)) {
  const m = f.match(/^(\d{2})\.(png|jpg|webp)$/);
  if (m) have[parseInt(m[1], 10)] = 'images/honsatsu/' + f;
}
let linked = 0;
const root = path.join('data', 'lessons');
for (const d of fs.readdirSync(root)) {
  const p = path.join(root, d, 'honsatsu-audio.json');
  if (!fs.existsSync(p)) continue;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;
  for (const t of doc.tracks) {
    const img = have[t.trackNo];
    if (img && t.image !== img) { t.image = img; changed = true; linked++; }
  }
  if (changed) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
}
console.log('Linked ' + linked + ' track(s). Images on disk: ' + Object.keys(have).length + ' of 87');
