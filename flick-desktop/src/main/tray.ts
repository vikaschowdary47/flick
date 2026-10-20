import {
  app,
  type BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  type NativeImage,
  screen,
  Tray,
} from "electron";
import { designTokens } from "../design/tokens";
import { getSettings, updateSettings } from "./settings";

// Menu bar (macOS) / system tray (Windows, Linux) mode: the widget opens as a
// popover under the icon, hides when you click elsewhere, and stays alive
// while hidden so files arriving in the background are already listed.

const TOGGLE_SHORTCUT = "Alt+Shift+F"; // Option+Shift+F on a Mac
const POPOVER_GAP = 6;

let tray: Tray | null = null;
let getWindow: () => BrowserWindow | null = () => null;
let hasNewArrival = false;
let dragInProgress = false;
let extraMenuItems: () => Electron.MenuItemConstructorOptions[] = () => [];

// ---- icon ------------------------------------------------------------------
// Drawn in code (like the drag icon) so there are no image assets to ship.
// macOS: a black "template" arrow that the menu bar recolors for light/dark.
// Windows/Linux: the coral sticker mark with a navy arrow.

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function drawIcon(size: number, template: boolean, dot: boolean): Buffer {
  const bitmap = Buffer.alloc(size * size * 4); // BGRA
  const s = size / 16;
  const navy = hexToRgb(designTokens.colors.navy);
  const coral = hexToRgb(designTokens.colors.coral);
  const ink: [number, number, number] = template ? [0, 0, 0] : navy;
  const stroke = 1.9 * s;
  // ↗ arrow, in 16-unit coordinates.
  const segments: Array<[number, number, number, number]> = [
    [4, 12, 11.5, 4.5],
    [6.5, 4.5, 11.5, 4.5],
    [11.5, 4.5, 11.5, 9.5],
  ];

  const put = (x: number, y: number, [r, g, b]: [number, number, number], alpha: number) => {
    const offset = (y * size + x) * 4;
    const a = Math.round(alpha * 255);
    if (a <= bitmap[offset + 3]) {
      return;
    }
    bitmap[offset] = b;
    bitmap[offset + 1] = g;
    bitmap[offset + 2] = r;
    bitmap[offset + 3] = a;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / s;
      const py = (y + 0.5) / s;
      if (!template) {
        // Rounded coral square behind the arrow.
        const nx = Math.max(3, Math.min(13, px));
        const ny = Math.max(3, Math.min(13, py));
        const inside = Math.hypot(px - nx, py - ny) <= 2.5;
        if (inside) {
          put(x, y, coral, 1);
        }
      }
      const d = Math.min(...segments.map(([ax, ay, bx, by]) => distanceToSegment(px, py, ax, ay, bx, by)));
      const coverage = Math.max(0, Math.min(1, stroke / 2 / s - d + 0.5));
      if (coverage > 0) {
        put(x, y, ink, coverage);
      }
      if (dot) {
        // "New file" dot, top-right. On a template image it shows in the
        // menu bar's ink color; elsewhere it's coral with a navy ring.
        const dd = Math.hypot(px - 13.2, py - 2.8);
        if (dd <= 2.8) {
          put(x, y, template ? ink : dd > 2 ? navy : coral, 1);
        }
      }
    }
  }
  return bitmap;
}

function trayImage(dot: boolean): NativeImage {
  const template = process.platform === "darwin";
  const image = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const size = 16 * scaleFactor;
    image.addRepresentation({
      scaleFactor,
      width: size,
      height: size,
      buffer: drawIcon(size, template, dot),
    });
  }
  if (template) {
    image.setTemplateImage(true);
  }
  return image;
}

// ---- popover -------------------------------------------------------------------

function positionUnderTray(window: BrowserWindow): void {
  if (!tray) {
    return;
  }
  const [width, height] = window.getSize();
  const icon = tray.getBounds();
  // Linux (AppIndicator) often reports empty bounds: fall back to the cursor.
  const anchor =
    icon.width > 0
      ? { x: icon.x + icon.width / 2, y: icon.y, bottom: icon.y + icon.height }
      : (() => {
          const point = screen.getCursorScreenPoint();
          return { x: point.x, y: point.y, bottom: point.y };
        })();
  const area = screen.getDisplayNearestPoint({ x: Math.round(anchor.x), y: Math.round(anchor.y) }).workArea;

  // Under the icon when the bar is at the top (macOS, most Linux), above it
  // when the taskbar is at the bottom (Windows default).
  const iconInTopHalf = anchor.y < area.y + area.height / 2;
  let x = Math.round(anchor.x - width / 2);
  let y = iconInTopHalf ? Math.round(anchor.bottom + POPOVER_GAP) : Math.round(anchor.y - height - POPOVER_GAP);
  x = Math.max(area.x + POPOVER_GAP, Math.min(x, area.x + area.width - width - POPOVER_GAP));
  y = Math.max(area.y + POPOVER_GAP, Math.min(y, area.y + area.height - height - POPOVER_GAP));
  window.setPosition(x, y, false);
}

export function showPopover(): void {
  const window = getWindow();
  if (!window) {
    return;
  }
  if (!getSettings().keepOnTop) {
    positionUnderTray(window);
  }
  window.show();
  window.focus();
  setArrivalDot(false);
}

export function togglePopover(): void {
  const window = getWindow();
  if (!window) {
    return;
  }
  if (window.isVisible() && window.isFocused()) {
    window.hide();
  } else {
    showPopover();
  }
}

function setArrivalDot(on: boolean): void {
  if (hasNewArrival === on || !tray) {
    return;
  }
  hasNewArrival = on;
  tray.setImage(trayImage(on));
}

// A file arrived: show the dot unless the popover is open in front.
export function noteArrival(): void {
  const window = getWindow();
  if (!window || !window.isVisible() || !window.isFocused()) {
    setArrivalDot(true);
  }
}

// While a card is being dragged out, clicking/dropping in another app
// mustn't hide the popover mid-drag.
let dragTimer: NodeJS.Timeout | null = null;

export function setDragInProgress(value: boolean): void {
  dragInProgress = value;
  if (dragTimer) {
    clearTimeout(dragTimer);
    dragTimer = null;
  }
  // If the drag ends outside our window we may never hear about it.
  if (value) {
    dragTimer = setTimeout(() => {
      dragInProgress = false;
    }, 15_000);
  }
}

function applyKeepOnTop(window: BrowserWindow): void {
  // Both modes float above other windows while visible; "Keep on top" also
  // stops the popover from hiding when you click elsewhere.
  window.setAlwaysOnTop(true, getSettings().keepOnTop ? "floating" : "pop-up-menu");
}

function buildMenu(): Menu {
  const settings = getSettings();
  const canLaunchAtLogin = process.platform === "darwin" || process.platform === "win32";
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: "Open Flick", accelerator: TOGGLE_SHORTCUT, click: showPopover },
    { type: "separator" },
    {
      label: "Keep on top",
      type: "checkbox",
      checked: settings.keepOnTop,
      click: (item) => {
        updateSettings({ keepOnTop: item.checked });
        const window = getWindow();
        if (window) {
          applyKeepOnTop(window);
        }
      },
    },
    ...(canLaunchAtLogin
      ? [
          {
            label: "Launch at login",
            type: "checkbox" as const,
            checked: app.getLoginItemSettings().openAtLogin,
            click: (item: Electron.MenuItem) => {
              app.setLoginItemSettings({ openAtLogin: item.checked });
            },
          },
        ]
      : []),
    ...extraMenuItems(),
    { type: "separator" },
    { label: "Quit Flick", role: "quit" },
  ];
  return Menu.buildFromTemplate(template);
}

// Other features (clips) can add items to the right-click menu.
export function setExtraTrayMenuItems(items: () => Electron.MenuItemConstructorOptions[]): void {
  extraMenuItems = items;
}

export function setupTray(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter;
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  tray = new Tray(trayImage(false));
  tray.setToolTip("Flick");
  tray.on("click", togglePopover);
  tray.on("right-click", () => tray?.popUpContextMenu(buildMenu()));
  // Linux AppIndicator has no click events, only a menu: always attach it.
  if (process.platform === "linux") {
    tray.setContextMenu(buildMenu());
  }

  if (!globalShortcut.register(TOGGLE_SHORTCUT, togglePopover)) {
    console.warn(`Flick couldn't register ${TOGGLE_SHORTCUT}; another app may be using it.`);
  }
  app.on("will-quit", () => globalShortcut.unregisterAll());
}

// Hook up a (re)created window: popover behavior on blur, hide instead of close.
export function attachWindow(window: BrowserWindow, isQuitting: () => boolean): void {
  applyKeepOnTop(window);
  window.on("blur", () => {
    if (!getSettings().keepOnTop && !dragInProgress && !window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });
  window.on("focus", () => setArrivalDot(false));
  window.on("close", (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      window.hide();
    }
  });
}
