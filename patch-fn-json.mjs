import fs from 'fs';
const p = 'supabase/functions/voice-tutor/index.ts';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('json_validate_failed')) { console.log('already patched'); process.exit(0); }
const a = s.indexOf('const r = await fetch(');
const b = s.indexOf('let out: any;');
if (a < 0 || b < 0) { console.log('anchors not found'); process.exit(1); }
const block = fs.readFileSync('block.txt', 'utf8');
s = s.slice(0, a) + block + s.slice(b);
s = s.replace('Respond ONLY as JSON:', 'Always answer with exactly one JSON object, never plain text. Respond ONLY as JSON:');
fs.writeFileSync(p, s);
console.log('function patched');
