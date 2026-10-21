export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Storage keys reject some characters; keep the visible name in the table row.
export function safeStorageName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+/, "");
  return cleaned.slice(-120) || "file";
}

// Files are deleted server-side 24 hours after upload (expire-files function).
export const FILE_LIFETIME_MS = 24 * 60 * 60 * 1000;

// Compact rows: "18h left" / "40m left".
export function formatTimeLeft(createdAt: string, now: number): string {
  const remaining = new Date(createdAt).getTime() + FILE_LIFETIME_MS - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Expiring…";
  const minutes = Math.ceil(remaining / 60_000);
  return minutes < 60 ? `${minutes}m left` : `${Math.floor(minutes / 60)}h left`;
}

export function formatExpiry(createdAt: string, now: number): string {
  const remaining = new Date(createdAt).getTime() + FILE_LIFETIME_MS - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Expiring…";
  const minutes = Math.ceil(remaining / 60_000);
  return minutes < 60 ? `Expires in ${minutes}m` : `Expires in ${Math.floor(minutes / 60)}h`;
}

// "from this device" / "from Vikas's iPhone", with long names cut to keep
// the card's metadata on one line. Empty when the sender isn't known.
const SENDER_MAX_CHARS = 16;

export function formatSender(
  deviceId: string | null,
  thisDeviceId: string | null,
  names: Record<string, string>,
): string {
  if (!deviceId) return "";
  if (deviceId === thisDeviceId) return "from this device";
  const name = names[deviceId];
  if (!name) return "";
  return `from ${name.length > SENDER_MAX_CHARS ? `${name.slice(0, SENDER_MAX_CHARS - 1).trimEnd()}…` : name}`;
}
