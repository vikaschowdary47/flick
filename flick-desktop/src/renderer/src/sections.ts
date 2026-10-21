import type { CloudFile } from "./types";

// Compact layout groups files into Pinned, Today and Earlier. Every file
// expires 24 hours after upload, so "Earlier" means yesterday's files that
// haven't expired yet. Order inside a section is unchanged (newest first).
export type SectionKey = "pinned" | "today" | "earlier";

export interface FileSection {
  key: SectionKey;
  title: string;
  files: CloudFile[];
}

const TITLES: Record<SectionKey, string> = {
  pinned: "Pinned",
  today: "Today",
  earlier: "Earlier",
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

export function groupSections(files: CloudFile[], now: number): FileSection[] {
  const groups: Record<SectionKey, CloudFile[]> = { pinned: [], today: [], earlier: [] };
  for (const file of files) {
    const key: SectionKey = file.pinned ? "pinned" : isToday(file.created_at, now) ? "today" : "earlier";
    groups[key].push(file);
  }
  return (Object.keys(groups) as SectionKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, title: TITLES[key], files: groups[key] }));
}

// Collapsed sections are remembered on this device.
const COLLAPSED_KEY = "flick.collapsedSections.v1";

export function loadCollapsed(): Set<SectionKey> {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? "[]");
    return new Set(Array.isArray(saved) ? (saved as SectionKey[]) : []);
  } catch {
    return new Set();
  }
}

export function saveCollapsed(collapsed: Set<SectionKey>): void {
  window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
}
