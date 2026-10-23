import { Directory, File, Paths } from "expo-file-system";

// Flick only keeps files on the phone temporarily. This module finds every
// copy the app (and the pickers it uses) left in the cache folder, and
// removes them by age, by size cap, or when their Flick file is gone.

export const CACHE_MAX_BYTES = 150 * 1024 * 1024; // 150 MB
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // unused for 24 hours

// One cached copy per Flick file: flick-open/<file id>/<name>, plus a
// .last-used marker rewritten each time the copy is opened.
export const OPEN_DIR = "flick-open";
const LAST_USED = ".last-used";
const UPLOAD_DIR = "flick-upload";
// Downloaded thumbnails: flick-thumbs/<file id>.jpg (see thumbs.ts).
const THUMB_DIR = "flick-thumbs";
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
    add(fileDir, fileDir instanceof Directory ? fileDir.name : null);
  }
  for (const thumb of children(THUMB_DIR)) {
    add(thumb, thumb instanceof File ? thumb.name.replace(/\.jpg$/, "") : null);
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
    // Brand-new copies (e.g. just uploaded) may not be in the file list yet.
    const gone =
      liveFileIds !== undefined &&
      entry.fileId !== null &&
      !liveFileIds.has(entry.fileId) &&
      now - entry.lastUsed > 2 * 60 * 1000;
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

// Settings → Clear cache (keeps a file that's open right now), and sign-out.
export function clearCache(protectUris: string[] = []): void {
  if (protectUris.length === 0) {
    for (const name of [OPEN_DIR, THUMB_DIR, UPLOAD_DIR, ...PICKER_DIRS]) {
      remove(new Directory(Paths.cache, name));
    }
    return;
  }
  for (const entry of entries()) {
    const keep = protectUris.some((uri) => uri.startsWith(entry.item.uri) || entry.item.uri.startsWith(uri));
    if (!keep) remove(entry.item);
  }
}

export function fileCacheDir(fileId: string): Directory {
  return new Directory(Paths.cache, OPEN_DIR, fileId);
}

// The cached copy of a Flick file, if there is one.
export function cachedCopy(fileId: string): File | null {
  try {
    const dir = fileCacheDir(fileId);
    if (!dir.exists) return null;
    const copy = dir.list().find((item): item is File => item instanceof File && item.name !== LAST_USED);
    return copy && (copy.size ?? 0) > 0 ? copy : null;
  } catch {
    return null;
  }
}

// Mark a cached copy as just used (its age for the 24-hour rule restarts).
export function touchCachedCopy(fileId: string): void {
  try {
    const dir = fileCacheDir(fileId);
    dir.create({ intermediates: true, idempotent: true });
    const marker = new File(dir, LAST_USED);
    if (!marker.exists) marker.create();
    marker.write(String(Date.now()));
  } catch {
    // only affects cleanup order
  }
}

// After an upload, keep our own copy as this file's cached copy, so opening
// it on the sending device needs no download.
export function adoptUploadCopy(fileId: string, copy: File, name: string): boolean {
  try {
    const dir = fileCacheDir(fileId);
    dir.create({ intermediates: true, idempotent: true });
    copy.move(new File(dir, name));
    touchCachedCopy(fileId);
    pruneCache({ protectUris: [dir.uri] });
    return true;
  } catch {
    return false;
  }
}

// Picker and converter copies live in our cache; drop them once uploaded.
export function deleteIfCached(uri: string): void {
  if (!uri.startsWith(Paths.cache.uri)) return;
  remove(new File(uri));
}

// Invalidates in-flight downloads so they cannot recreate a deleted account's cache.
let accountCacheEpoch = 0;
let accountCacheEnabled = true;
export const cacheEpoch = () => accountCacheEpoch;
export const cacheEpochActive = (epoch: number) => accountCacheEnabled && epoch === accountCacheEpoch;
export function setAccountCacheEnabled(enabled: boolean): void {
  if (accountCacheEnabled !== enabled) accountCacheEpoch++;
  accountCacheEnabled = enabled;
}
export function clearAccountCache(): void {
  setAccountCacheEnabled(false);
  const errors: unknown[] = [];
  for (const name of [OPEN_DIR, THUMB_DIR, UPLOAD_DIR, ...PICKER_DIRS]) {
    try { const dir = new Directory(Paths.cache, name); if (dir.exists) dir.delete(); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new Error("Some cached files could not be removed.");
}
