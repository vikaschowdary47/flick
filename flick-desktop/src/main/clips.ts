import { type BrowserWindow, clipboard, globalShortcut, ipcMain } from "electron";
import { setExtraTrayMenuItems } from "./tray";
import { APP_NAME } from "../shared/appName";

// Clips plumbing in the main process: reading/writing the clipboard on
// request, Option/Alt+Shift+C, and the tray's "Send clipboard" item. The
// renderer decides whether clips are active (feature_flags.clipboard and the
// user's profiles.clipboard_enabled) and tells us; while inactive there is no
// shortcut, no tray item, and the clipboard is never read. It's only ever
// read when the user clicks Send clipboard or presses the shortcut.

const SEND_SHORTCUT = "Alt+Shift+C"; // Option+Shift+C on a Mac

let getWindow: () => BrowserWindow | null = () => null;
let active = false;

// Read the clipboard now and hand it to the renderer, which sends the clip.
function sendClipboard(): void {
  const window = getWindow();
  if (!window || !active) {
    return;
  }
  // readText() is async in this Electron version; send the text, not a Promise.
  void Promise.resolve(clipboard.readText()).then((text) => {
    if (!window.isDestroyed()) window.webContents.send("clips:send-text", text);
  });
}

function setActive(next: boolean): void {
  active = next;
  if (globalShortcut.isRegistered(SEND_SHORTCUT)) {
    globalShortcut.unregister(SEND_SHORTCUT);
  }
  if (active && !globalShortcut.register(SEND_SHORTCUT, sendClipboard)) {
    console.warn(`${APP_NAME} couldn't register ${SEND_SHORTCUT}; another app may be using it.`);
  }
}

export function setupClips(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter;

  ipcMain.handle("clips:set-active", (_event, next: unknown) => {
    setActive(next === true);
  });
  // Only on an explicit click of Send clipboard.
  ipcMain.handle("clipboard:read", () => (active ? clipboard.readText() : ""));
  ipcMain.handle("clipboard:write", (_event, text: unknown) => {
    if (typeof text === "string") {
      clipboard.writeText(text);
    }
  });

  setExtraTrayMenuItems(() =>
    active
      ? [
          { type: "separator" },
          {
            label: "Send clipboard",
            accelerator: SEND_SHORTCUT,
            // Send without popping the window open; the renderer confirms
            // with a system notification.
            click: () => sendClipboard(),
          },
        ]
      : [],
  );
}
