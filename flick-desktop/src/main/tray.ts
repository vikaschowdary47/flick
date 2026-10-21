import {
  app,
  type BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  type NativeImage,
  screen,
  Tray,
} from "electron";
import { designTokens } from "../design/tokens";
import { type Bounds, getSettings, type ShowAs, updateSettings } from "./settings";

// Menu bar (macOS) / system tray (Windows, Linux): the icon opens Flick as a
// popover or a floating panel; "Open Flick" opens the resizable main window.
// The window stays alive while hidden, so files arriving in the background
// are already listed.

const TOGGLE_SHORTCUT = "Alt+Shift+F"; // Option+Shift+F on a Mac
const POPOVER_GAP = 6;

let tray: Tray | null = null;
let getWindow: () => BrowserWindow | null = () => null;
let hasNewArrival = false;
let dragInProgress = false;
let lastPopoverBlurHideAt = 0;
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

// ---- window modes ------------------------------------------------------------
// One window (it does the syncing, so there is only ever one) shown three ways:
// - popover: under the tray icon, compact, ~8 recent items, hides on click-away
// - panel:   always-on-top floating mini panel, movable, stays open
// - main:    resizable window from "Open Flick", remembers its size
export type WindowMode = "popover" | "panel" | "main";

// The popover sizes itself to its content (the page reports its height),
// between these bounds: a quick dropdown, not a window.
const POPOVER_WIDTH = 360;
// Low enough that the one-line empty state isn't padded with blank space.
const POPOVER_MIN_HEIGHT = 140;
const POPOVER_MAX_HEIGHT = 440;
const POPOVER_MAX_SHARE = 0.45; // of the screen's work area height
// "Open Flick" makes the same popover taller (never wider), up to this.
const EXPANDED_MAX_HEIGHT = 680;
const EXPANDED_MAX_SHARE = 0.8;
const RESIZE_MS = 180;
let popoverContentHeight = POPOVER_MIN_HEIGHT;
let popoverExpanded = false;
let resizeTimer: NodeJS.Timeout | null = null;
const PANEL_SIZE = { width: 320, height: 460 };
const MAIN_SIZE = { width: 480, height: 640 };
const MAIN_MIN = { width: 360, height: 420 };

let mode: WindowMode = "popover";

// Popover size: content height, between the minimum and the cap for the
// current state (compact or expanded), never taller than the screen allows.
function popoverSize(window: BrowserWindow): { width: number; height: number } {
  const area = screen.getDisplayMatching(window.getBounds()).workArea;
  const max = popoverExpanded
    ? Math.min(EXPANDED_MAX_HEIGHT, Math.floor(area.height * EXPANDED_MAX_SHARE))
    : Math.min(POPOVER_MAX_HEIGHT, Math.floor(area.height * POPOVER_MAX_SHARE));
  const usable = area.height - POPOVER_GAP * 2;
  const height = Math.min(usable, Math.max(POPOVER_MIN_HEIGHT, Math.min(max, Math.ceil(popoverContentHeight))));
  return { width: POPOVER_WIDTH, height };
}

function cancelResize(): void {
  if (resizeTimer) {
    clearInterval(resizeTimer);
    resizeTimer = null;
  }
}

// Size the popover to its content and re-anchor it under the icon. With
// `animate`, tween there over ~180ms (ease-out) so it grows from the icon.
function fitPopover(window: BrowserWindow, animate = false): void {
  const { width, height } = popoverSize(window);
  const target = anchoredBounds(width, height);
  window.setMinimumSize(POPOVER_WIDTH, POPOVER_MIN_HEIGHT);
  if (!target) {
    window.setSize(width, height, false);
    return;
  }
  cancelResize();
  const from = window.getBounds();
  if (!animate || !window.isVisible()) {
    window.setBounds(target, false);
    return;
  }
  const start = Date.now();
  resizeTimer = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / RESIZE_MS);
    const ease = 1 - (1 - t) ** 3;
    const mix = (a: number, b: number) => Math.round(a + (b - a) * ease);
    window.setBounds(
      {
        x: mix(from.x, target.x),
        y: mix(from.y, target.y),
        width: mix(from.width, target.width),
        height: mix(from.height, target.height),
      },
      false,
    );
    if (t >= 1) {
      cancelResize();
      // Content may have changed size mid-animation (e.g. settings loading):
      // settle on the latest reported height.
      fitPopover(window);
    }
  }, 1000 / 60);
}

// Ask the page to switch layouts ("Open Flick" from the tray menu, or the
// reset on hide). The page renders, measures, and reports back with
// popover:content-height, which does the resize.
function requestPopoverExpanded(expanded: boolean): void {
  getWindow()?.webContents.send("popover:expanded", expanded);
}
let saveTimer: NodeJS.Timeout | null = null;

export function currentMode(): WindowMode {
  return mode;
}

// Where a window of this size goes: under the tray icon when the bar is at
// the top (macOS, most Linux), above it when the taskbar is at the bottom
// (Windows default), always inside the work area.
function anchoredBounds(width: number, height: number): Bounds | null {
  if (!tray) {
    return null;
  }
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
  const iconInTopHalf = anchor.y < area.y + area.height / 2;
  let x = Math.round(anchor.x - width / 2);
  let y = iconInTopHalf ? Math.round(anchor.bottom + POPOVER_GAP) : Math.round(anchor.y - height - POPOVER_GAP);
  x = Math.max(area.x + POPOVER_GAP, Math.min(x, area.x + area.width - width - POPOVER_GAP));
  y = Math.max(area.y + POPOVER_GAP, Math.min(y, area.y + area.height - height - POPOVER_GAP));
  return { x, y, width, height };
}

function positionUnderTray(window: BrowserWindow): void {
  const [width, height] = window.getSize();
  const bounds = anchoredBounds(width, height);
  if (bounds) {
    window.setPosition(bounds.x, bounds.y, false);
  }
}

// Keep saved bounds on a screen that still exists.
function onScreen(bounds: Bounds | null): Bounds | null {
  if (!bounds) {
    return null;
  }
  const area = screen.getDisplayMatching(bounds).workArea;
  const visible =
    bounds.x < area.x + area.width - 40 &&
    bounds.x + bounds.width > area.x + 40 &&
    bounds.y >= area.y - 10 &&
    bounds.y < area.y + area.height - 40;
  return visible ? bounds : null;
}

function applyMode(window: BrowserWindow, next: WindowMode): void {
  mode = next;
  const settings = getSettings();
  if (next === "main") {
    window.setAlwaysOnTop(false);
    window.setResizable(true);
    window.setMinimumSize(MAIN_MIN.width, MAIN_MIN.height);
    const saved = onScreen(settings.mainBounds);
    if (saved) {
      window.setBounds(saved, false);
    } else {
      window.setSize(MAIN_SIZE.width, MAIN_SIZE.height, false);
      window.center();
    }
  } else if (next === "panel") {
    window.setAlwaysOnTop(true, "floating");
    window.setResizable(true);
    window.setMinimumSize(260, 300);
    const saved = onScreen(settings.panelBounds);
    if (saved) {
      window.setBounds(saved, false);
    } else {
      window.setSize(PANEL_SIZE.width, PANEL_SIZE.height, false);
      positionUnderTray(window);
    }
  } else {
    window.setAlwaysOnTop(true, "pop-up-menu");
    window.setResizable(false);
    fitPopover(window);
  }
  window.webContents.send("window:mode", next);
}

// Remember the main window's / panel's bounds as the user moves or resizes it.
function rememberBounds(window: BrowserWindow): void {
  if (mode === "popover" || !window.isVisible()) {
    return;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    const bounds = window.getBounds();
    updateSettings(mode === "main" ? { mainBounds: bounds } : { panelBounds: bounds });
  }, 400);
}

function showIn(next: WindowMode): void {
  const window = getWindow();
  if (!window) {
    return;
  }
  applyMode(window, next);
  window.show();
  window.focus();
  setArrivalDot(false);
}

// Tray click / Option+Shift+F: the user's choice of popover or panel.
export function showPopover(): void {
  showIn(getSettings().showAs);
}

// "Open Flick": the resizable main window.
export function openMainWindow(): void {
  showIn("main");
}

export function togglePopover(source: "tray" | "shortcut" = "shortcut"): void {
  const window = getWindow();
  if (!window) {
    return;
  }
  if (source === "tray" && Date.now() - lastPopoverBlurHideAt < 250) {
    return;
  }
  const wanted = getSettings().showAs;
  if (window.isVisible() && mode === wanted && (window.isFocused() || mode === "panel")) {
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

// A file arrived: show the dot unless Flick is open in front.
export function noteArrival(): void {
  const window = getWindow();
  if (!window || !window.isVisible() || !window.isFocused()) {
    setArrivalDot(true);
  }
}

let dragTimer: NodeJS.Timeout | null = null;

// While a card is being dragged out, clicking/dropping in another app
// mustn't hide the popover mid-drag.
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

function buildMenu(): Menu {
  const settings = getSettings();
  const canLaunchAtLogin = process.platform === "darwin" || process.platform === "win32";
  const setShowAs = (showAs: ShowAs) => {
    updateSettings({ showAs });
    if (mode !== "main" && getWindow()?.isVisible()) {
      showPopover();
    }
    refreshLinuxMenu();
  };
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Open Flick",
      click: () => {
        showIn("popover");
        requestPopoverExpanded(true);
      },
    },
    { type: "separator" },
    {
      label: "Show from menu bar as",
      submenu: [
        {
          label: "Menu bar popover",
          type: "radio",
          checked: settings.showAs === "popover",
          click: () => setShowAs("popover"),
        },
        {
          label: "Floating panel",
          type: "radio",
          checked: settings.showAs === "panel",
          click: () => setShowAs("panel"),
        },
      ],
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

// Linux shows a fixed menu (no click events): rebuild it after changes.
function refreshLinuxMenu(): void {
  if (process.platform === "linux") {
    tray?.setContextMenu(buildMenu());
  }
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
  tray.on("click", () => togglePopover("tray"));
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

// Hook up the window: mode behavior on blur, remembered bounds, hide not close.
export function attachWindow(window: BrowserWindow, isQuitting: () => boolean): void {
  window.on("blur", () => {
    // FLICK_KEEP_POPOVER=1 (development only) keeps it open for screenshots.
    const keepForDev = !app.isPackaged && process.env.FLICK_KEEP_POPOVER === "1";
    if (mode === "popover" && !dragInProgress && !keepForDev && !window.webContents.isDevToolsOpened()) {
      window.hide();
      lastPopoverBlurHideAt = Date.now();
    }
  });
  // The next tray click opens the compact popover again.
  window.on("hide", () => {
    cancelResize();
    if (popoverExpanded) {
      popoverExpanded = false;
      requestPopoverExpanded(false);
    }
  });
  window.on("focus", () => setArrivalDot(false));
  window.on("resize", () => rememberBounds(window));
  window.on("move", () => rememberBounds(window));
  window.on("close", (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      window.hide();
    }
  });
  // Tell a freshly loaded page which mode it's in.
  window.webContents.on("did-finish-load", () => window.webContents.send("window:mode", mode));
}

export function setupWindowModeIpc(): void {
  ipcMain.handle("window:get-mode", () => mode);
  // Settings panel in the popover: the per-device app settings.
  ipcMain.handle("settings:get-app", () => ({
    showAs: getSettings().showAs,
    canLaunchAtLogin: process.platform === "darwin" || process.platform === "win32",
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
  }));
  ipcMain.handle("settings:set-show-as", (_event, showAs: unknown) => {
    if (showAs === "popover" || showAs === "panel") {
      updateSettings({ showAs });
      if (mode !== "main" && getWindow()?.isVisible()) {
        showPopover();
      }
      refreshLinuxMenu();
    }
  });
  ipcMain.handle("settings:set-launch-at-login", (_event, on: unknown) => {
    if (typeof on === "boolean" && (process.platform === "darwin" || process.platform === "win32")) {
      app.setLoginItemSettings({ openAtLogin: on });
      refreshLinuxMenu();
    }
  });
  // The popover page reports its natural height whenever its list changes.
  // The page reports its natural height and layout after every change. A
  // layout change (Open Flick / Show less) animates; anything else snaps.
  ipcMain.on("popover:content-height", (_event, height: unknown, expanded: unknown) => {
    if (typeof height !== "number" || !Number.isFinite(height)) {
      return;
    }
    const window = getWindow();
    const toggled = (expanded === true) !== popoverExpanded;
    popoverContentHeight = height;
    popoverExpanded = expanded === true;
    if (!window || mode !== "popover") {
      return;
    }
    if (toggled) {
      fitPopover(window, true);
    } else if (!resizeTimer) {
      fitPopover(window); // mid-animation, the tween already heads there
    }
  });
  ipcMain.on("window:open-main", () => openMainWindow());
  ipcMain.on("window:hide", () => getWindow()?.hide());
}
