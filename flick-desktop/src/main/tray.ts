import {
  app,
  type BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  type NativeImage,
  screen,
  Tray,
} from "electron";
import { join } from "node:path";
import type { DesktopAppSettings } from "../shared/appSettings";
import { windowsPanelBounds, normalizeWindowsShortcut, replaceShortcut } from "./windows-behavior";
import { designTokens } from "../design/tokens";
import { APP_NAME } from "../shared/appName";
import { type Bounds, getSettings, type ShowAs, updateSettings } from "./settings";

// Menu bar (macOS) / system tray (Windows, Linux): the icon opens Flick as a
// popover or a floating panel; "Open eqlShare" opens the resizable main window.
// The window stays alive while hidden, so files arriving in the background
// are already listed.

const TOGGLE_SHORTCUT = "Alt+Shift+F"; // Option+Shift+F on a Mac
const POPOVER_GAP = 6;

let tray: Tray | null = null;
let registeredShortcut: string | null = null;
let shortcutError: string | null = null;
let windowsTipOpen = false;
let getWindow: () => BrowserWindow | null = () => null;
let hasNewArrival = false;
let dragInProgress = false;
let lastPopoverBlurHideAt = 0;
let extraMenuItems: () => Electron.MenuItemConstructorOptions[] = () => [];

// ---- icon ------------------------------------------------------------------
// macOS uses the monochrome template mark. Windows switches between black and
// white marks as the system taskbar theme changes.

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

// Kept as a fallback for older packaged resources.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const asset = app.isPackaged
    ? join(process.resourcesPath, dot ? "tray-template-dot.png" : "tray-template.png")
    : join(app.getAppPath(), "build", dot ? "tray-template-dot.png" : "tray-template.png");
  const image = nativeImage.createFromPath(asset);
  image.setTemplateImage(true);
  return image;
}

function windowsTrayImage(): NativeImage {
  const name = nativeTheme.shouldUseDarkColors ? "tray-windows-dark.png" : "tray-windows-light.png";
  const asset = app.isPackaged ? join(process.resourcesPath, name) : join(app.getAppPath(), "build", name);
  return nativeImage.createFromPath(asset);
}

// ---- window modes ------------------------------------------------------------
// One window (it does the syncing, so there is only ever one) shown three ways:
// - popover: under the tray icon, compact, ~8 recent items, hides on click-away
// - panel:   always-on-top floating mini panel, movable, stays open
// - main:    resizable window from "Open eqlShare", remembers its size
export type WindowMode = "popover" | "panel" | "main";

// The popover sizes itself to its content (the page reports its height),
// between these bounds: a quick dropdown, not a window.
const POPOVER_WIDTH = 360;
// Low enough that the one-line empty state isn't padded with blank space.
const POPOVER_MIN_HEIGHT = 140;
const POPOVER_MAX_HEIGHT = 540;
const POPOVER_MAX_SHARE = 0.65; // of the screen's work area height
// "Open eqlShare" makes the same popover taller (never wider), up to this.
const EXPANDED_MAX_HEIGHT = 680;
const EXPANDED_MAX_SHARE = 0.8;
const RESIZE_MS = 180;
let popoverExpanded = false;
let resizeTimer: NodeJS.Timeout | null = null;
const PANEL_SIZE = { width: 320, height: 460 };
const MAIN_SIZE = { width: 480, height: 640 };
const MAIN_MIN = { width: 360, height: 420 };

let mode: WindowMode = "popover";

// Popover size: content height, between the minimum and the cap for the
// current state (compact or expanded), never taller than the screen allows.
function popoverSize(window: BrowserWindow): { width: number; height: number } {
  const area = (process.platform === "win32" ? trayDisplay() : screen.getDisplayMatching(window.getBounds())).workArea;
  // A fixed height (not the content's): switching Files, Clips and Settings,
  // or a list loading, no longer makes the popover grow and shrink. The list
  // scrolls inside it. Only "Show all" / "Show less" change the height.
  const height = popoverExpanded
    ? Math.min(EXPANDED_MAX_HEIGHT, Math.floor(area.height * EXPANDED_MAX_SHARE))
    : Math.min(POPOVER_MAX_HEIGHT, Math.floor(area.height * POPOVER_MAX_SHARE));
  const usable = area.height - POPOVER_GAP * 2;
  return {
    width: process.platform === "win32" ? Math.min(POPOVER_WIDTH, area.width - POPOVER_GAP * 2) : POPOVER_WIDTH,
    height: Math.max(POPOVER_MIN_HEIGHT, Math.min(usable, height)),
  };
}

function cancelResize(): void {
  if (resizeTimer) {
    clearInterval(resizeTimer);
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
}

// Size the popover to its content and re-anchor it under the icon. With
// `animate`, tween there over ~180ms (ease-out) so it grows from the icon.
function fitPopover(window: BrowserWindow, animate = false): void {
  const { width, height } = popoverSize(window);
  const target = anchoredBounds(width, height);
  window.setMinimumSize(width, Math.min(POPOVER_MIN_HEIGHT, height));
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
  if (process.platform === "darwin") {
    // macOS animates the frame natively, which is smoother than stepping
    // setBounds from a timer. Settle on the latest height once it's done.
    window.setBounds(target, true);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      if (!window.isDestroyed()) fitPopover(window);
    }, RESIZE_MS + 60) as unknown as NodeJS.Timeout;
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

// Ask the page to switch layouts ("Open eqlShare" from the tray menu, or the
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
function trayDisplay(): Electron.Display {
  const icon = tray?.getBounds();
  const point = icon && icon.width > 0 && icon.height > 0
    ? { x: Math.round(icon.x + icon.width / 2), y: Math.round(icon.y + icon.height / 2) }
    : screen.getCursorScreenPoint();
  return screen.getDisplayNearestPoint(point);
}

function anchoredBounds(width: number, height: number): Bounds | null {
  if (!tray) {
    return null;
  }
  const icon = tray.getBounds();
  if (process.platform === "win32") {
    const display = trayDisplay();
    const point = screen.getCursorScreenPoint();
    const anchor = icon.width > 0 && icon.height > 0 ? icon : { ...point, width: 1, height: 1 };
    return windowsPanelBounds(anchor, display.bounds, display.workArea, width, height);
  }
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

// Show with a short fade, like a native menu, instead of popping in at once.
let fadeTimer: NodeJS.Timeout | null = null;
const FADE_MS = 140;
function fadeIn(window: BrowserWindow): void {
  if (fadeTimer) clearInterval(fadeTimer);
  const canFade = process.platform === "darwin" || process.platform === "win32";
  if (!canFade || window.isVisible()) {
    window.setOpacity(1);
    window.show();
    return;
  }
  window.setOpacity(0);
  window.show();
  const start = Date.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / FADE_MS);
    if (window.isDestroyed()) {
      if (fadeTimer) clearInterval(fadeTimer);
      return;
    }
    window.setOpacity(1 - (1 - t) ** 2);
    if (t >= 1 && fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }, 1000 / 60);
}

function showIn(next: WindowMode): void {
  const window = getWindow();
  if (!window) {
    return;
  }
  applyMode(window, next);
  if (process.platform === "darwin") {
    // Dock icon only while the full window is open; the menu bar popover/panel
    // stays Dock-less like other menu bar apps.
    if (next === "main") void app.dock?.show();
    else app.dock?.hide();
    // Open on the desktop (Space) the user is on now, not the one the window was
    // first shown on. Popover/panel stay on every Space; the main window is
    // pulled to the current Space and then pinned there.
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  }
  // Size and place the popover before it appears, so it never shows at an
    // old size and then jumps.
  if (next === "popover") fitPopover(window);
  fadeIn(window);
  if (process.platform === "darwin") {
    // A menu-bar (dock-less) app doesn't become active on its own, so the window
    // never got focus: clicks outside didn't close it and the tray click re-opened it.
    app.focus({ steal: true });
    if (next === "main") {
      setTimeout(() => {
        if (!window.isDestroyed()) window.setVisibleOnAllWorkspaces(false, { skipTransformProcessType: true });
      }, 100);
    }
  }
  window.focus();
  setArrivalDot(false);
  if (process.platform === "win32") void showWindowsTip(window);
}

async function showWindowsTip(window: BrowserWindow): Promise<void> {
  if (getSettings().windowsTipShown || windowsTipOpen || window.webContents.isLoadingMainFrame()) return;
  windowsTipOpen = true;
  try {
    const shortcut = getSettings().windowsShortcut;
    await dialog.showMessageBox(window, {
      type: "info", title: `${APP_NAME} is in your system tray`, message: `${APP_NAME} stays in your system tray when you close this panel.`,
      detail: `Use ${shortcut} to open or close ${APP_NAME} from anywhere.${shortcutError ? " This shortcut is currently unavailable; choose another in Settings." : ""}\n\nTo keep the icon visible, open the taskbar's hidden-icons arrow and drag ${APP_NAME} onto the visible tray. You can also enable ${APP_NAME} in Windows Settings → Personalization → Taskbar → Other system tray icons (Windows 11) or Select which icons appear on the taskbar (Windows 10).\n\nRight-click ${APP_NAME}'s tray icon for Open, Settings, or Quit.`,
      buttons: ["Got it"], defaultId: 0, noLink: true,
    });
    updateSettings({ windowsTipShown: true });
  } catch (error) { console.warn("Couldn't show the Windows tray tip:", error); }
  finally { windowsTipOpen = false; }
}

// Tray click / Option+Shift+F: the user's choice of popover or panel.
export function showPopover(): void {
  showIn(process.platform === "win32" ? "popover" : getSettings().showAs);
}

// "Open eqlShare": the resizable main window.
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
  const wanted = process.platform === "win32" ? "popover" : getSettings().showAs;
  // macOS: the menu-bar icon is a toggle. If the popover/panel is showing, a click
  // closes it, whether or not it currently has focus.
  const closeVisible = process.platform === "win32"
    ? window.isVisible() && window.isFocused()
    : window.isVisible() && (source === "tray" ? mode !== "main" || window.isFocused() : mode === wanted && (window.isFocused() || mode === "panel"));
  if (closeVisible) {
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
  if (process.platform === "win32") return Menu.buildFromTemplate([
    { label: "Open", click: () => showPopover() },
    { label: "Settings", click: () => {
      showPopover();
      requestPopoverExpanded(true);
      getWindow()?.webContents.send("settings:open");
    } },
    { type: "separator" },
    { label: "Quit", role: "quit" },
  ]);
  const settings = getSettings();
  const canLaunchAtLogin = process.platform === "darwin";
  const setShowAs = (showAs: ShowAs) => {
    updateSettings({ showAs });
    if (mode !== "main" && getWindow()?.isVisible()) {
      showPopover();
    }
    refreshLinuxMenu();
  };
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: `Open ${APP_NAME}`,
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
    { label: `Quit ${APP_NAME}`, role: "quit" },
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

  tray = process.platform === "win32"
    ? new Tray(windowsTrayImage(), "649d5631-5781-49ee-a2a0-c2a306bc4163")
    : new Tray(trayImage(false));
  tray.setToolTip(APP_NAME);
  tray.on("click", () => togglePopover("tray"));
  tray.on("right-click", () => tray?.popUpContextMenu(buildMenu()));
  // Linux AppIndicator has no click events, only a menu: always attach it.
  if (process.platform === "linux") {
    tray.setContextMenu(buildMenu());
  }
  if (process.platform === "win32") {
    nativeTheme.on("updated", () => tray?.setImage(windowsTrayImage()));
  }

  const shortcut = process.platform === "win32" ? normalizeWindowsShortcut(getSettings().windowsShortcut) ?? "Ctrl+Shift+Space" : TOGGLE_SHORTCUT;
  if (globalShortcut.register(shortcut, () => togglePopover())) registeredShortcut = shortcut;
  else {
    shortcutError = `Couldn't register ${shortcut}. Another app may be using it. Choose a different shortcut in Settings.`;
    console.warn(shortcutError);
  }
  if (process.platform === "win32") {
    // Only configure the default once, and only for the installed executable.
    // Later Task Manager/Windows Startup choices are left untouched.
    if (app.isPackaged && !getSettings().windowsStartupConfigured) {
      try {
        app.setLoginItemSettings({ openAtLogin: true, path: process.execPath, args: ["--hidden"] });
        updateSettings({ windowsStartupConfigured: true });
      } catch (error) { console.warn("Couldn't enable Start with Windows:", error); }
    }
    screen.on("display-metrics-changed", () => {
      const window = getWindow();
      if (window?.isVisible() && mode === "popover") fitPopover(window);
    });
  }
  app.on("will-quit", () => globalShortcut.unregisterAll());
}

// Hook up the window: mode behavior on blur, remembered bounds, hide not close.
export function attachWindow(window: BrowserWindow, isQuitting: () => boolean): void {
  window.on("blur", () => {
    // FLICK_KEEP_POPOVER=1 (development only) keeps it open for screenshots.
    const keepForDev = !app.isPackaged && process.env.FLICK_KEEP_POPOVER === "1";
    if (mode === "popover" && !windowsTipOpen && !dragInProgress && !keepForDev && !window.webContents.isDevToolsOpened()) {
      window.hide();
      lastPopoverBlurHideAt = Date.now();
    }
  });
  // The next tray click opens the compact popover again.
  window.on("hide", () => {
    if (process.platform === "darwin") app.dock?.hide();
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
  window.webContents.on("did-finish-load", () => {
    window.webContents.send("window:mode", mode);
    if (process.platform === "win32" && window.isVisible()) void showWindowsTip(window);
  });
}

function desktopSettings(): DesktopAppSettings {
  const windows = process.platform === "win32";
  const login = windows
    ? app.getLoginItemSettings({ path: process.execPath, args: ["--hidden"] })
    : app.getLoginItemSettings();
  return {
    showAs: windows ? "popover" : getSettings().showAs,
    isWindows: windows,
    canLaunchAtLogin: process.platform === "darwin" || (windows && app.isPackaged),
    launchAtLogin: login.openAtLogin && (!windows || login.executableWillLaunchAtLogin !== false),
    shortcut: windows ? getSettings().windowsShortcut : TOGGLE_SHORTCUT,
    shortcutRegistered: registeredShortcut !== null,
    shortcutError,
  };
}

function assertSettingsSender(event: Electron.IpcMainInvokeEvent): void {
  if (event.sender !== getWindow()?.webContents) throw new Error(`Settings are only available to the ${APP_NAME} window.`);
}

export function setupWindowModeIpc(): void {
  ipcMain.handle("window:get-mode", () => mode);
  // Settings panel in the popover: the per-device app settings.
  ipcMain.handle("settings:get-app", (event) => { assertSettingsSender(event); return desktopSettings(); });
  ipcMain.handle("settings:set-shortcut", (event, value: unknown) => {
    assertSettingsSender(event);
    if (process.platform !== "win32") return { error: "Shortcut customization is only available on Windows.", settings: desktopSettings() };
    const next = typeof value === "string" ? normalizeWindowsShortcut(value) : null;
    if (!next) return { error: "Use Ctrl, Alt or Win with a key, for example Ctrl+Shift+Space.", settings: desktopSettings() };
    if (next === "Alt+Shift+C") return { error: "Alt+Shift+C is reserved for Send clipboard. Choose another shortcut.", settings: desktopSettings() };
    const success = replaceShortcut(registeredShortcut, next,
      (shortcut) => !globalShortcut.isRegistered(shortcut) && globalShortcut.register(shortcut, () => togglePopover()),
      (shortcut) => globalShortcut.unregister(shortcut));
    if (!success) return { error: "That shortcut is unavailable. Try another; your previous shortcut has been kept.", settings: desktopSettings() };
    registeredShortcut = next; shortcutError = null;
    updateSettings({ windowsShortcut: next });
    return { error: null, settings: desktopSettings() };
  });
  ipcMain.handle("settings:set-show-as", (_event, showAs: unknown) => {
    if (showAs === "popover" || showAs === "panel") {
      updateSettings({ showAs });
      if (mode !== "main" && getWindow()?.isVisible()) {
        showPopover();
      }
      refreshLinuxMenu();
    }
  });
  ipcMain.handle("settings:set-launch-at-login", (event, on: unknown) => {
    assertSettingsSender(event);
    if (typeof on !== "boolean") throw new Error("A boolean startup preference is required.");
    if (process.platform === "win32") {
    if (!app.isPackaged) throw new Error(`Install ${APP_NAME} to enable Start with Windows.`);
      app.setLoginItemSettings({ openAtLogin: on, path: process.execPath, args: ["--hidden"] });
      updateSettings({ windowsStartupConfigured: true });
    } else if (process.platform === "darwin") app.setLoginItemSettings({ openAtLogin: on });
    refreshLinuxMenu();
    return desktopSettings();
  });
  // The popover page reports its natural height whenever its list changes.
  // The page reports its natural height and layout after every change. A
  // layout change (Open eqlShare / Show less) animates; anything else snaps.
  ipcMain.on("popover:content-height", (_event, height: unknown, expanded: unknown) => {
    if (typeof height !== "number" || !Number.isFinite(height)) {
      return;
    }
    const window = getWindow();
    const toggled = (expanded === true) !== popoverExpanded;
    popoverExpanded = expanded === true;
    if (!window) {
      return;
    }
    if (mode === "panel") {
      const [, currentHeight] = window.getSize();
      if (height > currentHeight) {
        window.setSize(window.getSize()[0], Math.ceil(height), false);
      }
      return;
    }
    if (mode !== "popover") return;
    if (toggled) {
      fitPopover(window, true);
    } else if (!resizeTimer) {
      fitPopover(window); // mid-animation, the tween already heads there
    }
  });
  ipcMain.on("window:open-main", () => openMainWindow());
  ipcMain.on("window:hide", () => getWindow()?.hide());
}
