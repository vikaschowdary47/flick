export interface CloudFileRow {
  id: string;
  user_id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  delivered_at: string | null;
  pinned?: boolean;
  pinned_at?: string | null;
  unpinned_at?: string | null; // last unpin: restarts the 24 hours
  device_id?: string | null; // sender
  thumb_path?: string | null; // ~200px JPEG for images
}

export interface CloudFile extends CloudFileRow {
  downloadState: "downloading" | "ready" | "error" | "delivered";
  localFileId?: string;
  downloadError?: string;
}

// Pinned files first, then newest.
export function compareFiles(left: CloudFileRow, right: CloudFileRow): number {
  const pinned = Number(Boolean(right.pinned)) - Number(Boolean(left.pinned));
  return pinned !== 0 ? pinned : right.created_at.localeCompare(left.created_at);
}

// "from this device" / "from Vikas's MacBook", shortened so the card's
// metadata stays on one line. Empty when the sender isn't known.
const SENDER_MAX_CHARS = 18;

export function formatSender(
  deviceId: string | null | undefined,
  thisDeviceId: string | null,
  names: Record<string, string>,
): string {
  if (!deviceId) {
    return "";
  }
  if (deviceId === thisDeviceId) {
    return "from this device";
  }
  const name = names[deviceId];
  if (!name) {
    return "";
  }
  return `from ${
    name.length > SENDER_MAX_CHARS
      ? `${name.slice(0, SENDER_MAX_CHARS - 1).trimEnd()}…`
      : name
  }`;
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function isCloudFile(value: unknown): value is CloudFileRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const file = value as Record<string, unknown>;
  return (
    typeof file.id === "string" &&
    typeof file.user_id === "string" &&
    typeof file.name === "string" &&
    typeof file.size === "number" &&
    typeof file.mime_type === "string" &&
    typeof file.storage_path === "string" &&
    typeof file.created_at === "string" &&
    (typeof file.delivered_at === "string" || file.delivered_at === null)
  );
}

export function getFileVisualType(
  file: CloudFile,
): "image" | "document" | "archive" | "other" {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.mime_type.startsWith("image/")) {
    return "image";
  }
  if (
    file.mime_type === "application/pdf" ||
    file.mime_type.startsWith("text/") ||
    ["doc", "docx", "odt", "rtf", "xls", "xlsx", "ppt", "pptx"].includes(
      extension,
    )
  ) {
    return "document";
  }
  if (
    ["zip", "gz", "gzip", "rar", "7z", "tar"].includes(extension) ||
    file.mime_type.includes("zip") ||
    file.mime_type.includes("compressed")
  ) {
    return "archive";
  }
  return "other";
}

export function getFileTileLabel(file: CloudFile): string {
  const extension = file.name.split(".").pop()?.toUpperCase() ?? "";
  return extension.length > 0 && extension.length <= 4 ? extension : "FILE";
}

// Files are deleted server-side 24 hours after upload (expire-files function).
export const FILE_LIFETIME_MS = 24 * 60 * 60 * 1000;

// Expiry: pinned files never expire; otherwise 24 hours from the later of
// upload and last unpin (unpinning restarts the timer). Matches expire-files.
interface Expiring {
  created_at: string;
  pinned?: boolean;
  unpinned_at?: string | null;
}

export function expiresAt(file: Expiring): number {
  if (file.pinned) {
    return Number.POSITIVE_INFINITY;
  }
  const start = Math.max(
    new Date(file.created_at).getTime(),
    file.unpinned_at ? new Date(file.unpinned_at).getTime() : 0,
  );
  return start + FILE_LIFETIME_MS;
}

function minutesLeft(file: Expiring, now: number): number | null {
  const remaining = expiresAt(file) - now;
  return !Number.isFinite(remaining) || remaining <= 0 ? null : Math.ceil(remaining / 60_000);
}

// Compact rows: "Pinned" / "18h left" / "40m left".
export function formatTimeLeft(file: Expiring, now: number): string {
  if (file.pinned) {
    return "Pinned";
  }
  const minutes = minutesLeft(file, now);
  if (minutes === null) {
    return "Expiring…";
  }
  return minutes < 60 ? `${minutes}m left` : `${Math.floor(minutes / 60)}h left`;
}

// Cards: "Pinned" / "Expires in 18h".
export function formatExpiry(file: Expiring, now: number): string {
  if (file.pinned) {
    return "Pinned";
  }
  const minutes = minutesLeft(file, now);
  if (minutes === null) {
    return "Expiring…";
  }
  return minutes < 60 ? `Expires in ${minutes}m` : `Expires in ${Math.floor(minutes / 60)}h`;
}
