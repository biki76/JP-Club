import fs from 'fs';
import zlib from 'zlib';
const css = ['css/tokens.css', 'css/tokens-extra.css'].map(p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '').join('\n');
function tok(name, fb) {
  const m = css.match(new RegExp('--' + name + '\\s*:\\s*(#[0-9a-fA-F]{6})'));
  if (!m) return fb;
  const h = m[1].slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const BG = tok('primary', [79, 70, 229]);
const FG = [255, 255, 255];
const T = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = T[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, pixel) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  let o = 0;
  for (let y = 0; y < h; y++) { raw[o++] = 0; for (let x = 0; x < w; x++) { const p = pixel(x, y); raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2]; } }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const J = ['11111', '00100', '00100', '00100', '00100', '10100', '01000'];
const P = ['11110', '10001', '10001', '11110', '10000', '10000', '10000'];
function glyph(gx, gy) {
  if (gy < 0 || gy > 6) return 0;
  if (gx >= 0 && gx < 5) return J[gy][gx] === '1' ? 1 : 0;
  if (gx >= 6 && gx < 11) return P[gy][gx - 6] === '1' ? 1 : 0;
  return 0;
}
function make(w, h, cell) {
  const gw = 11 * cell, gh = 7 * cell;
  const ox = Math.floor((w - gw) / 2), oy = Math.floor((h - gh) / 2);
  return png(w, h, (x, y) => {
    const on = x >= ox && x < ox + gw && y >= oy && y < oy + gh && glyph(Math.floor((x - ox) / cell), Math.floor((y - oy) / cell));
    return on ? FG : BG;
  });
}
fs.mkdirSync('icons', { recursive: true });
if (!fs.existsSync('icons/icon-192.png')) fs.writeFileSync('icons/icon-192.png', make(192, 192, 10));
if (!fs.existsSync('icons/icon-512.png')) fs.writeFileSync('icons/icon-512.png', make(512, 512, 28));
if (!fs.existsSync('og.png')) fs.writeFileSync('og.png', make(1200, 630, 50));
const mf = fs.existsSync('manifest.json') ? 'manifest.json' : (fs.existsSync('manifest.webmanifest') ? 'manifest.webmanifest' : null);
if (mf) {
  const s = fs.readFileSync(mf, 'utf8');
  if (!s.includes('icon-512.png')) {
    const j = JSON.parse(s);
    j.icons = j.icons || [];
    j.icons.push({ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' });
    fs.writeFileSync(mf, JSON.stringify(j, null, 2));
    console.log('manifest icons added');
  }
}
console.log('icons ok');
