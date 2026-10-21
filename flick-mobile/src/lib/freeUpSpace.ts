import type { FileRow } from "./types";

// The 80% storage prompt: which files to suggest removing. Oldest first,
// never pinned files, just enough to get back under 70% of the limit.
export const NUDGE_AT = 0.8;
const TARGET = 0.7;

export function oldestToRemove(files: FileRow[], usedBytes: number, maxBytes: number): FileRow[] {
  const target = maxBytes * TARGET;
  if (usedBytes <= target) return [];
  const candidates = files
    .filter((file) => !file.pinned)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const picked: FileRow[] = [];
  let remaining = usedBytes;
  for (const file of candidates) {
    if (remaining <= target) break;
    picked.push(file);
    remaining -= file.size;
  }
  return picked;
}
