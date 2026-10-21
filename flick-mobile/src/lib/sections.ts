import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FileRow } from "./types";

// Compact layout groups files into Pinned, Today and Earlier (same rules as
// the desktop). Files expire after 24 hours, so "Earlier" is yesterday's
// files that haven't expired yet. Order inside a section is unchanged.
export type SectionKey = "pinned" | "today" | "earlier";

export const SECTION_TITLES: Record<SectionKey, string> = {
  pinned: "PINNED",
  today: "TODAY",
  earlier: "EARLIER",
};

function isToday(iso: string, now: number): boolean {
  const date = new Date(iso);
  const today = new Date(now);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function groupFiles(files: FileRow[], now: number): { key: SectionKey; files: FileRow[] }[] {
  const groups: Record<SectionKey, FileRow[]> = { pinned: [], today: [], earlier: [] };
  for (const file of files) {
    groups[file.pinned ? "pinned" : isToday(file.created_at, now) ? "today" : "earlier"].push(file);
  }
  return (Object.keys(groups) as SectionKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, files: groups[key] }));
}

// Collapsed sections are remembered on this device.
const COLLAPSED_KEY = "flick.collapsedSections.v1";

export async function loadCollapsed(): Promise<SectionKey[]> {
  try {
    const saved: unknown = JSON.parse((await AsyncStorage.getItem(COLLAPSED_KEY)) ?? "[]");
    return Array.isArray(saved) ? (saved as SectionKey[]) : [];
  } catch {
    return [];
  }
}

export function saveCollapsed(keys: SectionKey[]): void {
  AsyncStorage.setItem(COLLAPSED_KEY, JSON.stringify(keys)).catch(() => {});
}
