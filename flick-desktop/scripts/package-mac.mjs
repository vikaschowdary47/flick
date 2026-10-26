// Local macOS test bundle. Distribution requires Developer ID signing/notarization.
import process from 'node:process';
import console from 'node:console';
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') throw new Error('package:mac requires macOS');
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const electronBundle = resolve(dirname(require.resolve('electron/package.json')), 'dist/Electron.app');
const bundle = join(root, 'dist', `mac-${Date.now()}`, 'eqlShare.app');
await mkdir(dirname(bundle), { recursive: true });
await cp(electronBundle, bundle, { recursive: true, verbatimSymlinks: true });
const appRoot = join(bundle, 'Contents/Resources/app');
await mkdir(appRoot, { recursive: true });
await cp(join(root, 'out'), join(appRoot, 'out'), { recursive: true });
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
await writeFile(join(appRoot, 'package.json'), JSON.stringify({ name: 'flick-desktop', productName: 'eqlShare', version, type: 'module', main: 'out/main/index.js' }));
await cp(join(root, 'build/eqlshare.icns'), join(bundle, 'Contents/Resources/eqlshare.icns'));
// Menu bar icon images: the app loads these from Contents/Resources when packaged
// (without them the menu bar item is invisible).
for (const name of ['tray-template.png', 'tray-template-dot.png']) {
  await cp(join(root, 'build', name), join(bundle, 'Contents/Resources', name));
}
const plist = join(bundle, 'Contents/Info.plist');
const set = (command) => execFileSync('/usr/libexec/PlistBuddy', ['-c', command, plist]);
set('Set :CFBundleName eqlShare');
set('Set :CFBundleDisplayName eqlShare');
set('Set :CFBundleIdentifier dev.flickit.desktop');
set(`Set :CFBundleShortVersionString ${version}`);
set(`Set :CFBundleVersion ${version}`);
set('Set :CFBundleExecutable eqlShare');
set('Set :CFBundleIconFile eqlshare.icns');
await rename(join(bundle, 'Contents/MacOS/Electron'), join(bundle, 'Contents/MacOS/eqlShare'));
try { set('Delete :CFBundleURLTypes'); } catch { /* No schemes in a stock Electron bundle. */ }
set('Add :CFBundleURLTypes array');
set('Add :CFBundleURLTypes:0 dict');
set('Add :CFBundleURLTypes:0:CFBundleURLName string eqlShare Authentication');
set('Add :CFBundleURLTypes:0:CFBundleURLSchemes array');
set('Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string eqlshare');
set('Add :CFBundleURLTypes:0:CFBundleURLSchemes:1 string flick'); // old login links still in inboxes
// Keep the app small: drop Electron's sample app and every UI language except English
// (about 48 MB of Chromium locale files the app never uses).
await rm(join(bundle, 'Contents/Resources/default_app.asar'), { force: true });
const frameworkResources = join(bundle, 'Contents/Frameworks/Electron Framework.framework/Versions/A/Resources');
for (const entry of await readdir(frameworkResources)) {
  if (entry.endsWith('.lproj') && entry !== 'en.lproj') await rm(join(frameworkResources, entry), { recursive: true, force: true });
}
for (const entry of await readdir(join(bundle, 'Contents/Resources'))) {
  if (entry.endsWith('.lproj') && entry !== 'en.lproj') await rm(join(bundle, 'Contents/Resources', entry), { recursive: true, force: true });
}
execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'inherit' });
console.log(`Built ${bundle}\nQuit development Electron before launching this bundle.\nThis ad-hoc signed bundle is for local testing, not distribution.`);
