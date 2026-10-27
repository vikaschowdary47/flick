export interface DesktopAppSettings {
  showAs: "popover" | "panel";
  isWindows: boolean;
  canLaunchAtLogin: boolean;
  launchAtLogin: boolean;
  shortcut: string;
  shortcutRegistered: boolean;
  shortcutError: string | null;
}
export type ArrivalNotice = { kind: "file" | "clip"; id: string };

// Clipboard history kept on this computer (main/clipHistory.ts).
export type ClipHistoryEntry = { id: string; text: string; copiedAt: string; pinned?: boolean };
export type ClipHistoryState = { enabled: boolean; entries: ClipHistoryEntry[] };
