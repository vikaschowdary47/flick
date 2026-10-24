// Rasterize Flick's existing code-drawn coral/arrow mark into a multi-size ICO.
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { URL, fileURLToPath } from 'node:url';
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
function chunk(name, data) {
  const tag = Buffer.from(name);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length); tag.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([tag, data])), data.length + 8);
  return result;
}
function distance(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}
function raster(size) {
  const data = Buffer.alloc(size * (size * 4 + 1));
  const segments = [[4, 12, 11.5, 4.5], [6.5, 4.5, 11.5, 4.5], [11.5, 4.5, 11.5, 9.5]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const rgba = [0, 0, 0, 0];
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const px = (x + (sx + 0.5) / 4) * 16 / size;
      const py = (y + (sy + 0.5) / 4) * 16 / size;
      const inside = Math.hypot(px - Math.max(3, Math.min(13, px)), py - Math.max(3, Math.min(13, py))) <= 2.5;
      if (!inside) continue;
      const arrow = Math.min(...segments.map(([ax, ay, bx, by]) => distance(px, py, ax, ay, bx, by))) < 0.95;
      const rgb = arrow ? [27, 33, 64] : [246, 115, 129];
      rgb.forEach((value, i) => { rgba[i] += value; }); rgba[3]++;
    }
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    for (let i = 0; i < 3; i++) data[offset + i] = rgba[3] ? Math.round(rgba[i] / rgba[3]) : 0;
    data[offset + 3] = Math.round(rgba[3] * 255 / 16);
  }
  return data;
}
function png(size) {
  const data = raster(size);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(data)), chunk('IEND', Buffer.alloc(0))]);
}
function bitmap(size) {
  const rgba = raster(size);
  const maskStride = Math.ceil(size / 32) * 4;
  const result = Buffer.alloc(40 + size * size * 4 + maskStride * size);
  result.writeUInt32LE(40); result.writeInt32LE(size, 4); result.writeInt32LE(size * 2, 8);
  result.writeUInt16LE(1, 12); result.writeUInt16LE(32, 14); result.writeUInt32LE(size * size * 4, 20);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const src = (size - 1 - y) * (size * 4 + 1) + 1 + x * 4;
    const dst = 40 + (y * size + x) * 4;
    result[dst] = rgba[src + 2]; result[dst + 1] = rgba[src + 1]; result[dst + 2] = rgba[src]; result[dst + 3] = rgba[src + 3];
    if (!rgba[src + 3]) result[40 + size * size * 4 + y * maskStride + Math.floor(x / 8)] |= 1 << (7 - x % 8);
  }
  return result;
}
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map((size) => size === 256 ? png(size) : bitmap(size));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const base = 6 + i * 16;
  header[base] = sizes[i] === 256 ? 0 : sizes[i]; header[base + 1] = header[base];
  header.writeUInt16LE(1, base + 4); header.writeUInt16LE(32, base + 6);
  header.writeUInt32LE(images[i].length, base + 8); header.writeUInt32LE(offset, base + 12);
  offset += images[i].length;
}
const folder = fileURLToPath(new URL('../build/', import.meta.url));
mkdirSync(folder, { recursive: true });
writeFileSync(fileURLToPath(new URL('../build/icon.ico', import.meta.url)), Buffer.concat([header, ...images]));
