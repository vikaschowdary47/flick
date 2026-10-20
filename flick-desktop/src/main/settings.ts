import { app } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Per-device app settings, saved in <userData>/settings.json (not synced).
export interface AppSettings {
  // true: the widget floats and stays put; false: tray popover that hides
  // when you click elsewhere.
  keepOnTop: boolean;
  // Settings → Clipboard sharing (only used when CLIPBOARD_ENABLED).
  clipboardSharing: boolean;
}

const DEFAULTS: AppSettings = { keepOnTop: false, clipboardSharing: false };

let cached: AppSettings | null = null;

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function getSettings(): AppSettings {
  if (cached) {
    return cached;
  }
  try {
    const saved = JSON.parse(readFileSync(settingsPath(), "utf8")) as Partial<AppSettings>;
    cached = {
      keepOnTop: typeof saved.keepOnTop === "boolean" ? saved.keepOnTop : DEFAULTS.keepOnTop,
      clipboardSharing:
        typeof saved.clipboardSharing === "boolean"
          ? saved.clipboardSharing
          : DEFAULTS.clipboardSharing,
    };
  } catch {
    cached = { ...DEFAULTS };
  }
  return cached;
}

export function updateSettings(changes: Partial<AppSettings>): AppSettings {
  cached = { ...getSettings(), ...changes };
  try {
    writeFileSync(settingsPath(), JSON.stringify(cached, null, 2), "utf8");
  } catch (error: unknown) {
    console.error("Could not save Flick settings:", error);
  }
  return cached;
}
