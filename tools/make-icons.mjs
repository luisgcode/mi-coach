// Generates plain PNG icons (no dependencies): cobalt background, white rising trend line with a dot.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(size, pad) {
  const px = Buffer.alloc(size * size * 3);
  const set = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= size || y >= size) return; const i = (y * size + x) * 3; px[i] = r; px[i + 1] = g; px[i + 2] = b; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, 0x1f, 0x5f, 0xd1);
  const s = v => pad + v * (size - 2 * pad); // 0..1 inside the safe area
  const pts = [[0.12, 0.72], [0.38, 0.5], [0.58, 0.62], [0.88, 0.28]];
  const w = size * 0.055;
  const disc = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, 255, 255, 255); };
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; const steps = size; for (let k = 0; k <= steps; k++) { const t = k / steps; disc(s(a[0] + (b[0] - a[0]) * t), s(a[1] + (b[1] - a[1]) * t), w / 2); } }
  disc(s(0.88), s(0.28), w * 1.3);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync(path.join(out, 'icon-192.png'), png(192, 24));
writeFileSync(path.join(out, 'icon-512.png'), png(512, 64));
writeFileSync(path.join(out, 'icon-512-maskable.png'), png(512, 110));
writeFileSync(path.join(out, 'apple-touch-icon.png'), png(180, 22));
console.log('icons written to', out);
