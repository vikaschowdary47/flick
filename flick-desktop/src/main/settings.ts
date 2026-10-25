import { app } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Per-device app settings, saved in <userData>/settings.json (not synced).
export type ShowAs = "popover" | "panel";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppSettings {
  // Where the tray icon (and Option/Alt+Shift+F) shows Flick: a menu bar
  // popover that hides on click-away, or an always-on-top floating panel.
  showAs: ShowAs;
  windowsShortcut: string;
  windowsTipShown: boolean;
  windowsStartupConfigured: boolean;
  // Last size/position of the resizable main window ("Open eqlDrop").
  mainBounds: Bounds | null;
  // Last position/size of the floating panel.
  panelBounds: Bounds | null;
}

const DEFAULTS: AppSettings = { showAs: "popover", mainBounds: null, panelBounds: null,
  windowsShortcut: "Ctrl+Shift+Space", windowsTipShown: false, windowsStartupConfigured: false };

let cached: AppSettings | null = null;

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

function isBounds(value: unknown): value is Bounds {
  const b = value as Partial<Bounds> | null;
  return (
    !!b &&
    [b.x, b.y, b.width, b.height].every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function write(settings: AppSettings): void {
  try {
    mkdirSync(app.getPath("userData"), { recursive: true });
    writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
  } catch (error: unknown) {
    console.error("Could not save Flick settings:", error);
  }
}

export function getSettings(): AppSettings {
  if (cached) {
    return cached;
  }
  try {
    const saved = JSON.parse(readFileSync(settingsPath(), "utf8")) as Record<string, unknown>;
    cached = {
      windowsShortcut: typeof saved.windowsShortcut === "string" ? saved.windowsShortcut : DEFAULTS.windowsShortcut,
      windowsTipShown: saved.windowsTipShown === true,
      windowsStartupConfigured: saved.windowsStartupConfigured === true,      // Older builds had "Keep on top"; on means the floating panel.
      showAs:
        saved.showAs === "panel" || saved.showAs === "popover"
          ? saved.showAs
          : saved.keepOnTop === true
            ? "panel"
            : DEFAULTS.showAs,
      mainBounds: isBounds(saved.mainBounds) ? saved.mainBounds : null,
      panelBounds: isBounds(saved.panelBounds) ? saved.panelBounds : null,
    };
    // Drop keys older builds wrote (keepOnTop, clipboardSharing).
    if ("keepOnTop" in saved || "clipboardSharing" in saved) {
      write(cached);
    }
  } catch {
    cached = { ...DEFAULTS };
  }
  return cached;
}

export function updateSettings(changes: Partial<AppSettings>): AppSettings {
  cached = { ...getSettings(), ...changes };
  write(cached);
  return cached;
}
