#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import console from "node:console";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { URL } from "node:url";
import sharp from "sharp";

const root = resolve(new URL("../..", import.meta.url).pathname);
const brand = join(root, "assets/brand");
const svgPath = join(brand, "eqlshare-icon.svg");
const darkSvgPath = join(brand, "eqlshare-icon-dark.svg");
const monoSvgPath = join(brand, "eqlshare-icon-mono.svg");
const faviconSvgPath = join(brand, "eqlshare-favicon.svg");
const lockupLightSvgPath = join(brand, "eqlshare-lockup-light.svg");
const lockupDarkSvgPath = join(brand, "eqlshare-lockup-dark.svg");
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
// The glyph (bar + rounded triangle) spans x 220..805, y 189..812 in the 1024 source,
// so its visual centre is (512, 500). `glyphScale` is relative to the 1024 source.
//   bg: "none" | "rounded" (Windows/Linux/legacy) | "circle" (Android round) | "mac" (macOS grid)
const GLYPH = (color) => `<rect x="221" y="189" width="583" height="126" rx="63" fill="${color}"/><polygon points="260,433 764,433 512,772" fill="${color}" stroke="${color}" stroke-width="79" stroke-linejoin="round"/>`;
const markSvg = (size, { glyphScale = 1, bg = "none", color = INK } = {}) => {
  const k = size / 1024;
  const backgrounds = {
    none: "",
    rounded: `<rect x="32" y="32" width="960" height="960" rx="200" fill="${YELLOW}"/>`,
    circle: `<circle cx="512" cy="512" r="472" fill="${YELLOW}"/>`,
    // macOS Big Sur+ icon grid: 824pt tile inside the 1024 canvas, with a soft shadow.
    mac: `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="14"/><feOffset dy="10" result="b"/><feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="100" y="100" width="824" height="824" rx="185" fill="${YELLOW}" filter="url(#s)"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="scale(${k})">${backgrounds[bg]}<g transform="translate(512 512) scale(${glyphScale}) translate(-512 -500)">${GLYPH(color)}</g></g></svg>`;
};

async function png(svg, size, options = {}) {
  return sharp(Buffer.from(svg(size, options))).png().toBuffer();
}

async function renderSvg(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function renderLockup(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer();
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

// No alpha channel: App Store Connect rejects app icons that have one.
const full = await sharp(await renderSvg(sourceSvg, 1024)).removeAlpha().png().toBuffer();
const fullDark = await renderSvg(darkSvg, 1024);
const mono = await renderSvg(monoSvg, 1024);
const monoWhiteSvg = monoSvg.replaceAll("#000000", "#FFFFFF");
// Windows/Linux/legacy Android: rounded tile with slim padding.
const rounded = await png(markSvg, 1024, { bg: "rounded", glyphScale: 0.80 });
const roundIcon = await png(markSvg, 1024, { bg: "circle", glyphScale: 0.70 });
const macIcon = await png(markSvg, 1024, { bg: "mac", glyphScale: 0.70 });
// Android adaptive layers: launchers show only the middle 72/108 and may crop to a
// circle (66dp safe zone), so the glyph stays well inside it.
const ADAPTIVE_GLYPH = 0.66;
const foreground = await png(markSvg, 1024, { glyphScale: ADAPTIVE_GLYPH });
const monochrome = await png(markSvg, 1024, { glyphScale: ADAPTIVE_GLYPH, color: "#000000" });
// Notification icon: white silhouette on transparent, 96px (24dp @ xxxhdpi).
const notification = await png(markSvg, 96, { glyphScale: 1.25, color: "#FFFFFF" });
const background = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: YELLOW } }).png().toBuffer();

await save(join(mobile, "assets/icon.png"), full);
await save(join(mobile, "assets/icon-dark.png"), fullDark);
await save(join(mobile, "assets/icon-mono.png"), mono);
await save(join(mobile, "assets/lockup-light.png"), await renderLockup(lockupLightSvg));
await save(join(mobile, "assets/lockup-dark.png"), await renderLockup(lockupDarkSvg));
// Splash: just the mark on transparent; app.json sets the mustard/dark background.
await save(join(mobile, "assets/splash-icon.png"), await png(markSvg, 1024));
await save(join(mobile, "assets/splash-icon-dark.png"), await png(markSvg, 1024, { color: YELLOW }));
await save(join(mobile, "assets/favicon.svg"), Buffer.from(faviconSvg));
await save(join(mobile, "assets/favicon.png"), await renderSvg(faviconSvg, 512));
await save(join(mobile, "assets/android-icon-background.png"), background);
await save(join(mobile, "assets/android-icon-foreground.png"), foreground);
await save(join(mobile, "assets/android-icon-monochrome.png"), monochrome);
await save(join(mobile, "assets/notification-icon.png"), notification);
await save(join(mobile, "assets/android-icon-round.png"), roundIcon);
await save(join(mobile, "assets/android-icon-legacy.png"), rounded);

const densitySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(densitySizes)) {
  const dir = join(mobile, "android/app/src/main/res", `mipmap-${density}`);
  const layer = Math.round(size * 108 / 48); // adaptive layers are 108dp, not 48dp
  await save(join(dir, "ic_launcher.webp"), await sharp(rounded).resize(size, size).webp({ lossless: true }).toBuffer());
  await save(join(dir, "ic_launcher_round.webp"), await sharp(roundIcon).resize(size, size).webp({ lossless: true }).toBuffer());
  await save(join(dir, "ic_launcher_background.webp"), await sharp(background).resize(layer, layer).webp({ lossless: true }).toBuffer());
  await save(join(dir, "ic_launcher_foreground.webp"), await sharp(foreground).resize(layer, layer).webp({ lossless: true }).toBuffer());
  await save(join(dir, "ic_launcher_monochrome.webp"), await sharp(monochrome).resize(layer, layer).webp({ lossless: true }).toBuffer());
  // Native splash drawables are produced by `expo prebuild` from app.json (imageWidth 120dp).
}
await save(join(mobile, "android/app/src/main/res/drawable/ic_notification.png"), notification);

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
  await save(join(iconset, `icon_${size}x${size}.png`), await sharp(macIcon).resize(size, size).png().toBuffer());
  if (size <= 512) await save(join(iconset, `icon_${size}x${size}@2x.png`), await sharp(macIcon).resize(size * 2, size * 2).png().toBuffer());
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
await save(join(desktopPublic, "lockup-light.png"), await renderLockup(lockupLightSvg));
await save(join(desktopPublic, "lockup-dark.png"), await renderLockup(lockupDarkSvg));
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

// Store listing icons (the feature graphic and Windows tiles in assets/store and
// flick-desktop/build/appx are hand-made; regenerate them separately if the logo changes).
const store = join(root, "assets/store");
await save(join(store, "app-store/app-store-icon-1024.png"), full);
await save(join(store, "play-store/play-store-icon-512.png"), await sharp(full).resize(512, 512).png().toBuffer());
await save(join(store, "mac-app-store/mac-icon-1024.png"), macIcon);

console.log("Generated eqlShare icons from", svgPath);
