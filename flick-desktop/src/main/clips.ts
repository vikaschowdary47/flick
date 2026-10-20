import { type BrowserWindow, clipboard, globalShortcut, ipcMain } from "electron";
import { CLIPBOARD_ENABLED } from "../renderer/src/config";
import { getSettings, updateSettings } from "./settings";
import { setExtraTrayMenuItems } from "./tray";

// Clips plumbing in the main process: the per-device "Clipboard sharing"
// setting, reading/writing the clipboard on request, and Option/Alt+Shift+C.
// The clipboard is only ever read when the user clicks Send clipboard or
// presses the shortcut — never in the background.

const SEND_SHORTCUT = "Alt+Shift+C"; // Option+Shift+C on a Mac

let getWindow: () => BrowserWindow | null = () => null;
let showWindow: () => void = () => {};

function clipsActive(): boolean {
  return CLIPBOARD_ENABLED && getSettings().clipboardSharing;
}

// Read the clipboard now and hand it to the renderer, which sends the clip.
function sendClipboard(): void {
  const window = getWindow();
  if (!window || !clipsActive()) {
    return;
  }
  window.webContents.send("clips:send-text", clipboard.readText());
}

function applyShortcut(): void {
  if (globalShortcut.isRegistered(SEND_SHORTCUT)) {
    globalShortcut.unregister(SEND_SHORTCUT);
  }
  if (clipsActive() && !globalShortcut.register(SEND_SHORTCUT, sendClipboard)) {
    console.warn(`Flick couldn't register ${SEND_SHORTCUT}; another app may be using it.`);
  }
}

function setSharing(on: boolean): void {
  updateSettings({ clipboardSharing: on });
  applyShortcut();
  getWindow()?.webContents.send("settings:clipboard-sharing", on);
}

export function setupClips(windowGetter: () => BrowserWindow | null, show: () => void): void {
  getWindow = windowGetter;
  showWindow = show;

  ipcMain.handle("settings:get-clipboard-sharing", () => CLIPBOARD_ENABLED && getSettings().clipboardSharing);
  ipcMain.handle("settings:set-clipboard-sharing", (_event, on: unknown) => {
    if (CLIPBOARD_ENABLED && typeof on === "boolean") {
      setSharing(on);
    }
  });
  // Only on an explicit click of Send clipboard.
  ipcMain.handle("clipboard:read", () => (clipsActive() ? clipboard.readText() : ""));
  ipcMain.handle("clipboard:write", (_event, text: unknown) => {
    if (typeof text === "string") {
      clipboard.writeText(text);
    }
  });

  if (!CLIPBOARD_ENABLED) {
    return; // no shortcut, no menu items: the app behaves as before
  }
  applyShortcut();
  setExtraTrayMenuItems(() => [
    { type: "separator" },
    {
      label: "Clipboard sharing",
      type: "checkbox",
      checked: getSettings().clipboardSharing,
      click: (item) => setSharing(item.checked),
    },
    ...(getSettings().clipboardSharing
      ? [
          {
            label: "Send clipboard",
            accelerator: SEND_SHORTCUT,
            click: () => {
              showWindow();
              sendClipboard();
            },
          },
        ]
      : []),
  ]);
}
