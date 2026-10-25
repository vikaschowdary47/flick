import { URL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { windowsPanelBounds, normalizeWindowsShortcut, replaceShortcut, windowsFileName } from '../src/main/windows-behavior.ts';
import { findAuthCallback, isAuthCallbackUrl } from '../src/main/auth-links.ts';
const display = { x: 0, y: 0, width: 1920, height: 1080 };
const cases = [
  ['bottom', { x: 1700, y: 1040, width: 24, height: 40 }, { x: 0, y: 0, width: 1920, height: 1040 }, (p) => p.y + p.height < 1040],
  ['top', { x: 1700, y: 0, width: 24, height: 40 }, { x: 0, y: 40, width: 1920, height: 1040 }, (p) => p.y > 40],
  ['left', { x: 0, y: 960, width: 40, height: 24 }, { x: 40, y: 0, width: 1880, height: 1080 }, (p) => p.x > 40],
  ['right', { x: 1880, y: 960, width: 40, height: 24 }, { x: 0, y: 0, width: 1880, height: 1080 }, (p) => p.x + p.width < 1880],
];
for (const [edge, icon, area, onCorrectSide] of cases) test(`panel stays on screen beside ${edge} taskbar`, () => {
  const panel = windowsPanelBounds(icon, display, area, 360, 460);
  assert.ok(onCorrectSide(panel));
  assert.ok(panel.x >= area.x && panel.y >= area.y);
  assert.ok(panel.x + panel.width <= area.x + area.width);
  assert.ok(panel.y + panel.height <= area.y + area.height);
});
test('handles secondary monitors with negative origins and a small work area', () => {
  const area = { x: -800, y: -900, width: 800, height: 860 };
  const p = windowsPanelBounds({ x: -30, y: -40, width: 24, height: 40 }, { ...area, height: 900 }, area, 1200, 1200);
  assert.ok(p.x >= area.x && p.y >= area.y);
  assert.ok(p.x + p.width <= 0 && p.y + p.height <= -40);
});
test('auto-hidden taskbar still anchors the panel above a bottom icon', () => {
  const p = windowsPanelBounds({ x: 1700, y: 1078, width: 24, height: 2 }, display, display, 360, 460);
  assert.equal(p.y + p.height, 1074);
});
test('normalizes shortcut aliases and rejects malformed or unmodified shortcuts', () => {
  assert.equal(normalizeWindowsShortcut('control+shift+space'), 'Ctrl+Shift+Space');
  assert.equal(normalizeWindowsShortcut('Alt + Ctrl + f'), 'Ctrl+Alt+F');
  assert.equal(normalizeWindowsShortcut('Win+Shift+F2'), 'Shift+Super+F2');
  for (const invalid of ['', 'Space', 'Shift+A', 'Ctrl+Ctrl+A', 'Ctrl++A', 'Ctrl+NotAKey']) assert.equal(normalizeWindowsShortcut(invalid), null);
});
test('a conflict keeps the old shortcut registered; success releases it only afterward', () => {
  const events = [];
  assert.equal(replaceShortcut('Ctrl+Shift+Space', 'Ctrl+Alt+F', () => false, (s) => events.push(s)), false);
  assert.deepEqual(events, []);
  assert.equal(replaceShortcut('Ctrl+Shift+Space', 'Ctrl+Alt+F', (s) => { events.push(`register:${s}`); return true; }, (s) => events.push(`unregister:${s}`)), true);
  assert.deepEqual(events, ['register:Ctrl+Alt+F', 'unregister:Ctrl+Shift+Space']);
});
test('finds auth callback in cold and second-instance Windows arguments', () => {
  const callback = 'flick://auth-callback?code=test-code';
  assert.equal(findAuthCallback(['C:\\Program Files\\Flick\\Flick.exe', '--hidden', callback]), callback);
  assert.equal(findAuthCallback(['electron.exe', 'C:\\My App', callback]), callback);
  for (const bad of ['flick://auth-callback.evil?code=x', 'https://auth-callback?code=x', 'flick://auth-callback/other', 'not a URL']) assert.equal(isAuthCallbackUrl(bad), false);
});
test('NSIS configuration uses the same app identity, protocol and exact installer name', () => {
  const config = JSON.parse(readFileSync(new URL('../electron-builder.win.json', import.meta.url)));
  assert.equal(config.appId, 'dev.flickit.desktop');
  assert.equal(config.nsis.artifactName, 'eqlDrop-Setup.exe');
  assert.deepEqual(config.protocols[0].schemes, ['flick']);
  assert.equal(config.nsis.createStartMenuShortcut, true);
  assert.deepEqual(config.extraResources, [
    { from: 'build/icon.ico', to: 'icon.ico' },
    { from: 'build/tray-template.png', to: 'tray-template.png' },
    { from: 'build/tray-template-dot.png', to: 'tray-template-dot.png' },
    { from: 'build/tray-windows-light.png', to: 'tray-windows-light.png' },
    { from: 'build/tray-windows-dark.png', to: 'tray-windows-dark.png' },
  ]);
  const icon = readFileSync(new URL('../build/icon.ico', import.meta.url));
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), 8);
});

test('Windows disk names strip reserved characters and avoid device names', () => {
  assert.equal(windowsFileName('report: draft?.pdf'), 'report_ draft_.pdf');
  assert.equal(windowsFileName('CON.txt'), '_CON.txt');
  assert.equal(windowsFileName('COM1'), '_COM1');
  assert.equal(windowsFileName('notes. '), 'notes');
  assert.equal(windowsFileName('photo.jpg'), 'photo.jpg');
});
