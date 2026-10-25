#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import console from "node:console";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { URL } from "node:url";
import sharp from "sharp";

const root = resolve(new URL("../..", import.meta.url).pathname);
const svgPath = join(root, "eqlshare-icon.svg");
const darkSvgPath = join(root, "eqlshare-icon-dark.svg");
const monoSvgPath = join(root, "eqlshare-icon-mono.svg");
const faviconSvgPath = join(root, "eqlshare-favicon.svg");
const lockupLightSvgPath = join(root, "eqlshare-lockup-light.svg");
const lockupDarkSvgPath = join(root, "eqlshare-lockup-dark.svg");
const desktop = join(root, "flick-desktop");
const mobile = join(root, "flick-mobile");
const build = join(desktop, "build");
const desktopPublic = join(desktop, "src/renderer/public");
const sourceSvg = await readFile(svgPath, "utf8");
const darkSvg = await readFile(darkSvgPath, "utf8");
const monoSvg = await readFile(monoSvgPath, "utf8");
const faviconSvg = await readFile(faviconSvgPath, "utf8");
const lockupLightSvg = await readFile(lockupLightSvgPath, "utf8");
const lockupDarkSvg = await readFile(lockupDarkSvgPath, "utf8");

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

async function renderSvg(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function fitSvg(svg, size, contentSize) {
  const content = await renderSvg(svg, contentSize);
  const offset = Math.floor((size - contentSize) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: content, left: offset, top: offset }])
    .png()
    .toBuffer();
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

const full = await renderSvg(sourceSvg, 1024);
const fullDark = await renderSvg(darkSvg, 1024);
const mono = await renderSvg(monoSvg, 1024);
const monoWhiteSvg = monoSvg.replaceAll("#000000", "#FFFFFF");
const rounded = await png(markSvg, 1024, { rounded: true });
const foreground = await png(markSvg, 1024, { safe: true });
const monochrome = await renderSvg(monoSvg, 1024);
const background = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: YELLOW } }).png().toBuffer();

await save(join(mobile, "assets/icon.png"), full);
await save(join(mobile, "assets/icon-dark.png"), fullDark);
await save(join(mobile, "assets/icon-mono.png"), mono);
await save(join(mobile, "assets/lockup-light.png"), await renderSvg(lockupLightSvg, 557));
await save(join(mobile, "assets/lockup-dark.png"), await renderSvg(lockupDarkSvg, 557));
await save(join(mobile, "assets/splash-icon.png"), full);
await save(join(mobile, "assets/splash-icon-dark.png"), fullDark);
await save(join(mobile, "assets/favicon.svg"), Buffer.from(faviconSvg));
await save(join(mobile, "assets/favicon.png"), await renderSvg(faviconSvg, 512));
await save(join(mobile, "assets/android-icon-background.png"), background);
await save(join(mobile, "assets/android-icon-foreground.png"), foreground);
await save(join(mobile, "assets/android-icon-monochrome.png"), monochrome);
await save(join(mobile, "assets/notification-icon.png"), await renderSvg(monoWhiteSvg, 24));
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
  await save(join(mobile, "android/app/src/main/res", `drawable-${density}`, "splashscreen_logo_dark.png"), await sharp(fullDark).resize(size, size).png().toBuffer());
}
await save(join(mobile, "android/app/src/main/res/drawable/ic_notification.png"), await renderSvg(monoWhiteSvg, 24));

const appIconSet = join(mobile, "ios/Flick/Images.xcassets/AppIcon.appiconset");
await save(join(appIconSet, "App-Icon-1024x1024@1x.png"), full);
await save(join(appIconSet, "App-Icon-Dark-1024x1024@1x.png"), fullDark);
await save(join(appIconSet, "App-Icon-Tinted-1024x1024@1x.png"), mono);
await save(join(appIconSet, "Contents.json"), Buffer.from(JSON.stringify({
  images: [
    { filename: "App-Icon-1024x1024@1x.png", idiom: "universal", platform: "ios", size: "1024x1024", scale: "1x" },
    { appearances: [{ appearance: "luminosity", value: "dark" }], filename: "App-Icon-Dark-1024x1024@1x.png", idiom: "universal", platform: "ios", size: "1024x1024", scale: "1x" },
    { appearances: [{ appearance: "luminosity", value: "tinted" }], filename: "App-Icon-Tinted-1024x1024@1x.png", idiom: "universal", platform: "ios", size: "1024x1024", scale: "1x" },
  ],
  info: { author: "xcode", version: 1 },
}, null, 2)));
await save(join(mobile, "assets/widget-icon.png"), full);
await save(join(mobile, "assets/widget-icon-dark.png"), fullDark);
await save(join(mobile, "assets/widget-icon-mono.png"), mono);

const icoSizes = [16, 24, 32, 48, 64, 96, 128, 256];
await save(join(build, "icon.ico"), ico(await Promise.all(icoSizes.map(async (size) => ({ size, data: await sharp(rounded).resize(size, size).png().toBuffer() })))));
// Keep the menu-bar mark visually aligned with neighboring macOS status icons.
// This is intentionally smaller than the app/adaptive icon safe zone.
const trayTemplate = await fitSvg(monoSvg, 32, 28);
await save(join(build, "tray-template.png"), trayTemplate);
await save(join(build, "tray-template-dot.png"), await sharp(trayTemplate).composite([
  { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="27" cy="5" r="3" fill="#F5B83D"/></svg>') },
]).png().toBuffer());
await save(join(build, "tray-windows-light.png"), await fitSvg(monoSvg, 32, 28));
await save(join(build, "tray-windows-dark.png"), await fitSvg(monoWhiteSvg, 32, 28));
for (const size of [16, 24, 32, 48, 64, 128, 256]) {
  await save(join(build, "linux", `${size}x${size}.png`), await sharp(rounded).resize(size, size).png().toBuffer());
}

const iconset = join(build, "eqlshare.iconset");
await rm(iconset, { recursive: true, force: true });
await mkdir(iconset, { recursive: true });
for (const size of [16, 32, 128, 256, 512, 1024]) {
  await save(join(iconset, `icon_${size}x${size}.png`), await sharp(full).resize(size, size).png().toBuffer());
  if (size <= 512) await save(join(iconset, `icon_${size}x${size}@2x.png`), await sharp(full).resize(size * 2, size * 2).png().toBuffer());
}
try {
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", join(build, "eqlshare.icns")], { stdio: "inherit" });
} catch {
  console.warn("iconutil is unavailable; the PNG/ICO assets were still generated.");
}
await rm(iconset, { recursive: true, force: true });

const faviconPngs = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await renderSvg(faviconSvg, size) })));
await save(join(desktopPublic, "favicon.svg"), Buffer.from(faviconSvg));
await save(join(desktopPublic, "favicon.png"), await renderSvg(faviconSvg, 48));
await save(join(desktopPublic, "favicon-16.png"), faviconPngs[0].data);
await save(join(desktopPublic, "favicon-32.png"), faviconPngs[1].data);
await save(join(desktopPublic, "favicon-48.png"), faviconPngs[2].data);
await save(join(desktopPublic, "favicon.ico"), ico(faviconPngs));
for (const size of [192, 512]) {
  await save(join(desktopPublic, `pwa-icon-${size}.png`), await renderSvg(sourceSvg, size));
  await save(join(desktopPublic, `pwa-maskable-${size}.png`), await renderSvg(sourceSvg, size));
}
await save(join(desktopPublic, "icon.png"), full);
await save(join(desktopPublic, "icon-dark.png"), fullDark);
await save(join(desktopPublic, "lockup-light.svg"), Buffer.from(lockupLightSvg));
await save(join(desktopPublic, "lockup-dark.svg"), Buffer.from(lockupDarkSvg));
await save(join(desktopPublic, "manifest.webmanifest"), Buffer.from(JSON.stringify({
  name: "eqlShare",
  short_name: "eqlShare",
  start_url: ".",
  display: "standalone",
  theme_color: YELLOW,
  background_color: "#FFF8EE",
  icons: [
    { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2)));

console.log("Generated eqlShare icons from", svgPath);
