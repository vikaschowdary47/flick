// Local macOS test bundle. Distribution requires Developer ID signing/notarization.
import process from 'node:process';
import console from 'node:console';
import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') throw new Error('package:mac requires macOS');
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const electronBundle = resolve(dirname(require.resolve('electron/package.json')), 'dist/Electron.app');
const bundle = join(root, 'dist', `mac-${Date.now()}`, 'Flick.app');
await mkdir(dirname(bundle), { recursive: true });
await cp(electronBundle, bundle, { recursive: true, verbatimSymlinks: true });
const appRoot = join(bundle, 'Contents/Resources/app');
await mkdir(appRoot, { recursive: true });
await cp(join(root, 'out'), join(appRoot, 'out'), { recursive: true });
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
await writeFile(join(appRoot, 'package.json'), JSON.stringify({ name: 'flick-desktop', productName: 'Flick', version, type: 'module', main: 'out/main/index.js' }));
const plist = join(bundle, 'Contents/Info.plist');
const set = (command) => execFileSync('/usr/libexec/PlistBuddy', ['-c', command, plist]);
set('Set :CFBundleName Flick');
set('Set :CFBundleDisplayName Flick');
set('Set :CFBundleIdentifier dev.flickit.desktop');
set(`Set :CFBundleShortVersionString ${version}`);
set(`Set :CFBundleVersion ${version}`);
set('Set :CFBundleExecutable Flick');
await rename(join(bundle, 'Contents/MacOS/Electron'), join(bundle, 'Contents/MacOS/Flick'));
try { set('Delete :CFBundleURLTypes'); } catch { /* No schemes in a stock Electron bundle. */ }
set('Add :CFBundleURLTypes array');
set('Add :CFBundleURLTypes:0 dict');
set('Add :CFBundleURLTypes:0:CFBundleURLName string Flick Authentication');
set('Add :CFBundleURLTypes:0:CFBundleURLSchemes array');
set('Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string flick');
execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'inherit' });
console.log(`Built ${bundle}\nQuit development Electron before launching this bundle.\nThis ad-hoc signed bundle is for local testing, not distribution.`);
