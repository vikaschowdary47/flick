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
