// The data the home/lock-screen widgets show, built from the app's lists.
// Platform-neutral: iOS writes it to the App Group (modules/flick-widgets);
// the Android widget will reuse the same shape.
import { siteName, type ClipRow } from "./clips";
import { expiresAt, formatBytes, isExpired } from "./format";
import type { FileRow } from "./types";

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_ITEMS = 8;

export type SnapshotItem = {
  id: string;
  kind: "file" | "clip";
  // file: image | document | archive | other; clip: link | text
  type: "image" | "document" | "archive" | "other" | "link" | "text";
  title: string; // file name, site name, or first line of a clip
  subtitle: string; // "2.4 MB" or the full link / text preview
  sender: string; // "from …" or ""
  createdAt: string;
  expiresAt: string;
  pinned: boolean;
  thumb: string | null; // file name under thumbs/ in the shared container
  url: string; // deep link: flick://file/<id> or flick://clip/<id>
};

export type WidgetSnapshot = {
  version: number;
  updatedAt: string;
  items: SnapshotItem[]; // newest first, pinned first (same order as the app)
  fileCount: number;
  clipCount: number;
  // The newest clip in full, for "Copy latest clip".
  latestClip: { id: string; content: string } | null;
  // Lock Screen shows counts only unless the user turned this on.
  showContentOnLockScreen: boolean;
  // A widget that's switched off in Settings shows "Turned off in eqlShare"
  // (iOS doesn't let apps remove widgets the user placed).
  homeEnabled: boolean;
  lockEnabled: boolean;
};

function fileType(file: FileRow): SnapshotItem["type"] {
  const mime = file.mime_type ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || mime.startsWith("text/") || /\.(docx?|pages|txt|md|rtf|key|pptx?|xlsx?|numbers|csv)$/i.test(file.name))
    return "document";
  if (/zip|compressed|tar|gzip|7z|rar/.test(mime)) return "archive";
  return "other";
}

function firstLine(text: string): string {
  return (text.split(/\r?\n/).find((line) => line.trim()) ?? text).trim().slice(0, 120);
}

export function buildSnapshot(input: {
  files: FileRow[];
  clips: ClipRow[];
  senderOf: (deviceId: string | null) => string;
  thumbs: Record<string, string>; // file id → saved thumbnail name
  showContentOnLockScreen: boolean;
  homeEnabled?: boolean;
  lockEnabled?: boolean;
  now?: number;
}): WidgetSnapshot {
  const now = input.now ?? Date.now();
  const live = input.files.filter((file) => !isExpired(file, now));
  const liveClips = input.clips.filter((clip) => new Date(clip.expires_at).getTime() > now);

  const fileItems: SnapshotItem[] = live.map((file) => ({
    id: file.id,
    kind: "file",
    type: fileType(file),
    title: file.name,
    subtitle: formatBytes(file.size),
    sender: input.senderOf(file.device_id),
    createdAt: file.created_at,
    // Pinned files don't expire: a far-future date keeps them on the widget.
    expiresAt: file.pinned ? "9999-12-31T00:00:00.000Z" : new Date(expiresAt(file)).toISOString(),
    pinned: file.pinned,
    thumb: input.thumbs[file.id] ?? null,
    url: `flick://file/${file.id}`,
  }));
  const clipItems: SnapshotItem[] = liveClips.map((clip) => ({
    id: clip.id,
    kind: "clip",
    type: clip.kind === "link" ? "link" : "text",
    title: clip.kind === "link" ? siteName(clip.content) : firstLine(clip.content),
    subtitle: clip.content.slice(0, 200),
    sender: input.senderOf(clip.device_id),
    createdAt: clip.created_at,
    expiresAt: clip.expires_at,
    pinned: false,
    thumb: null,
    url: `flick://clip/${clip.id}`,
  }));

  // Pinned files first, then everything newest first.
  const items = [...fileItems, ...clipItems]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, SNAPSHOT_ITEMS);

  const newestClip = liveClips[0] ?? null;
  return {
    version: SNAPSHOT_VERSION,
    updatedAt: new Date(now).toISOString(),
    items,
    fileCount: live.length,
    clipCount: liveClips.length,
    latestClip: newestClip ? { id: newestClip.id, content: newestClip.content } : null,
    showContentOnLockScreen: input.showContentOnLockScreen,
    homeEnabled: input.homeEnabled ?? true,
    lockEnabled: input.lockEnabled ?? true,
  };
}
