import fs from 'node:fs';
let s = fs.readFileSync('sw.js', 'utf8');
s = s.replace(/const VERSION(\s*)= 'v(\d+)'/, (m, a, v) => `const VERSION${a}= 'v${+v + 1}'`);
fs.writeFileSync('sw.js', s);
console.log((s.match(/const VERSION\s*= '[^']+'/) || [''])[0]);
