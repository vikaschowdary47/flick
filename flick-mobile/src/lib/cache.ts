import { Directory, File, Paths } from "expo-file-system";

// Flick only keeps files on the phone temporarily. This module finds every
// copy the app (and the pickers it uses) left in the cache folder, and
// removes them by age, by size cap, or when their Flick file is gone.

export const CACHE_MAX_BYTES = 150 * 1024 * 1024; // 150 MB
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // unused for 24 hours

// Preview/Share downloads live in flick-open/<file id>/<random>/.
export const OPEN_DIR = "flick-open";
const UPLOAD_DIR = "flick-upload";
// Copies the pickers and the HEIC converter write into our cache.
const PICKER_DIRS = ["ImagePicker", "ImageManipulator", "DocumentPicker"];

type Entry = {
  item: Directory | File;
  fileId: string | null; // the Flick file a download belongs to
  bytes: number;
  lastUsed: number; // ms since epoch
};

function measure(item: Directory | File): { bytes: number; lastUsed: number } {
  if (item instanceof File) {
    const info = item.info();
    return { bytes: info.size ?? 0, lastUsed: info.modificationTime ?? 0 };
  }
  let bytes = 0;
  let lastUsed = 0;
  for (const child of item.list()) {
    const m = measure(child);
    bytes += m.bytes;
    lastUsed = Math.max(lastUsed, m.lastUsed);
  }
  return { bytes, lastUsed };
}

function entries(): Entry[] {
  const result: Entry[] = [];
  const add = (item: Directory | File, fileId: string | null) => {
    try {
      result.push({ item, fileId, ...measure(item) });
    } catch {
      // vanished or unreadable; skip it
    }
  };
  const children = (name: string) => {
    try {
      const dir = new Directory(Paths.cache, name);
      return dir.exists ? dir.list() : [];
    } catch {
      return [];
    }
  };

  for (const fileDir of children(OPEN_DIR)) {
    if (!(fileDir instanceof Directory)) {
      add(fileDir, null);
      continue;
    }
    for (const copy of fileDir.list()) add(copy, fileDir.name);
  }
  for (const name of [UPLOAD_DIR, ...PICKER_DIRS]) {
    for (const item of children(name)) add(item, null);
  }
  return result;
}

function remove(item: Directory | File) {
  try {
    if (item.exists) item.delete();
  } catch {
    // the OS clears the cache eventually anyway
  }
}

// Total bytes Flick has in the cache right now.
export function cacheSize(): number {
  return entries().reduce((sum, entry) => sum + entry.bytes, 0);
}

type PruneOptions = {
  // Flick file ids that still exist. Downloads of any other file are removed.
  liveFileIds?: Set<string>;
  // Copies in use right now (e.g. open in the viewer), by uri prefix.
  protectUris?: string[];
};

// Remove copies of deleted/expired files, copies unused for 24 hours, then
// the oldest copies until the total is under 150 MB.
export function pruneCache({ liveFileIds, protectUris = [] }: PruneOptions = {}): void {
  const now = Date.now();
  const isProtected = (entry: Entry) =>
    protectUris.some((uri) => uri.startsWith(entry.item.uri) || entry.item.uri.startsWith(uri));

  const kept: Entry[] = [];
  for (const entry of entries()) {
    if (isProtected(entry)) {
      kept.push(entry);
      continue;
    }
    const gone = liveFileIds !== undefined && entry.fileId !== null && !liveFileIds.has(entry.fileId);
    const stale = now - entry.lastUsed > CACHE_MAX_AGE_MS;
    if (gone || stale) remove(entry.item);
    else kept.push(entry);
  }

  let total = kept.reduce((sum, entry) => sum + entry.bytes, 0);
  for (const entry of kept.sort((a, b) => a.lastUsed - b.lastUsed)) {
    if (total <= CACHE_MAX_BYTES) break;
    if (isProtected(entry)) continue;
    remove(entry.item);
    total -= entry.bytes;
  }

  // Tidy empty per-file folders.
  try {
    const open = new Directory(Paths.cache, OPEN_DIR);
    if (open.exists) {
      for (const dir of open.list()) {
        if (dir instanceof Directory && dir.list().length === 0) remove(dir);
      }
    }
  } catch {
    // ignore
  }
}

// Settings → Clear cache, and sign-out.
export function clearCache(): void {
  for (const name of [OPEN_DIR, UPLOAD_DIR, ...PICKER_DIRS]) {
    remove(new Directory(Paths.cache, name));
  }
}

// Picker and converter copies live in our cache; drop them once uploaded.
export function deleteIfCached(uri: string): void {
  if (!uri.startsWith(Paths.cache.uri)) return;
  remove(new File(uri));
}
