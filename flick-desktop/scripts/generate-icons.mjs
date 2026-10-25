#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import console from "node:console";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { URL } from "node:url";
import sharp from "sharp";

const root = resolve(new URL("../..", import.meta.url).pathname);
const svgPath = join(root, "eqldrop-icon.svg");
const desktop = join(root, "flick-desktop");
const mobile = join(root, "flick-mobile");
const build = join(desktop, "build");
const sourceSvg = await readFile(svgPath, "utf8");

const YELLOW = "#F5B83D";
const INK = "#2B2210";
const markSvg = (size, { safe = false, safeScale = 0.66, rounded = false, color = INK } = {}) => {
  const scale = safe ? safeScale * size / 583 : size / 1024;
  const offset = safe ? (size - 583 * scale) / 2 : 221 * scale;
  const top = safe ? (size - 583 * scale) / 2 : 189 * scale;
  const rx = rounded ? size * 0.18 : 0;
  const bg = rounded ? `<rect width="${size}" height="${size}" rx="${rx}" fill="${YELLOW}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}<g fill="${color}" stroke="${color}" stroke-linejoin="round" transform="translate(${offset - 221 * scale} ${top - 189 * scale}) scale(${scale})"><rect x="221" y="189" width="583" height="126" rx="63" stroke="none"/><polygon points="260,433 764,433 512,772" stroke-width="79"/></g></svg>`;
};

async function png(svg, size, options = {}) {
  return sharp(Buffer.from(svg(size, options))).png().toBuffer();
}

async function save(path, buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
}

function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

const full = await png(() => sourceSvg, 1024);
const rounded = await png(markSvg, 1024, { rounded: true });
const foreground = await png(markSvg, 1024, { safe: true });
const monochrome = await png(markSvg, 1024, { safe: true, color: "#000000" });
const background = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: YELLOW } }).png().toBuffer();

await save(join(mobile, "assets/icon.png"), full);
await save(join(mobile, "assets/splash-icon.png"), full);
await save(join(mobile, "assets/favicon.png"), await sharp(full).resize(512, 512).png().toBuffer());
await save(join(mobile, "assets/android-icon-background.png"), background);
await save(join(mobile, "assets/android-icon-foreground.png"), foreground);
await save(join(mobile, "assets/android-icon-monochrome.png"), monochrome);
await save(join(mobile, "assets/android-icon-round.png"), rounded);
await save(join(mobile, "assets/android-icon-legacy.png"), rounded);

const densitySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(densitySizes)) {
  const dir = join(mobile, "android/app/src/main/res", `mipmap-${density}`);
  await save(join(dir, "ic_launcher.webp"), await sharp(rounded).resize(size, size).webp().toBuffer());
  await save(join(dir, "ic_launcher_round.webp"), await sharp(rounded).resize(size, size).webp().toBuffer());
  await save(join(dir, "ic_launcher_background.webp"), await sharp(background).resize(size, size).webp().toBuffer());
  await save(join(dir, "ic_launcher_foreground.webp"), await sharp(foreground).resize(size, size).webp().toBuffer());
  await save(join(dir, "ic_launcher_monochrome.webp"), await sharp(monochrome).resize(size, size).webp().toBuffer());
  await save(join(mobile, "android/app/src/main/res", `drawable-${density}`, "splashscreen_logo.png"), await sharp(full).resize(size, size).png().toBuffer());
}

await save(join(mobile, "ios/Flick/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"), full);

const icoSizes = [16, 24, 32, 48, 64, 96, 128, 256];
await save(join(build, "icon.ico"), ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await sharp(rounded).resize(size, size).png().toBuffer() })))));
// Keep the menu-bar mark visually aligned with neighboring macOS status icons.
// This is intentionally smaller than the app/adaptive icon safe zone.
const trayTemplate = await png(markSvg, 32, { safe: true, safeScale: 0.50, color: "#000000" });
await save(join(build, "tray-template.png"), trayTemplate);
await save(join(build, "tray-template-dot.png"), await sharp(trayTemplate).composite([
  { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="27" cy="5" r="3" fill="#F5B83D"/></svg>') },
]).png().toBuffer());
for (const size of [16, 24, 32, 48, 64, 128, 256]) {
  await save(join(build, "linux", `${size}x${size}.png`), await sharp(rounded).resize(size, size).png().toBuffer());
}

const iconset = join(build, "eqldrop.iconset");
await rm(iconset, { recursive: true, force: true });
await mkdir(iconset, { recursive: true });
for (const size of [16, 32, 128, 256, 512, 1024]) {
  await save(join(iconset, `icon_${size}x${size}.png`), await sharp(rounded).resize(size, size).png().toBuffer());
  if (size <= 512) await save(join(iconset, `icon_${size}x${size}@2x.png`), await sharp(rounded).resize(size * 2, size * 2).png().toBuffer());
}
try {
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", join(build, "eqldrop.icns")], { stdio: "inherit" });
} catch {
  console.warn("iconutil is unavailable; the PNG/ICO assets were still generated.");
}
await rm(iconset, { recursive: true, force: true });

console.log("Generated eqlDrop icons from", svgPath);
