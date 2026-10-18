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

export function formatExpiry(createdAt: string, now: number): string {
  const remaining = new Date(createdAt).getTime() + FILE_LIFETIME_MS - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Expiring…";
  const minutes = Math.ceil(remaining / 60_000);
  return minutes < 60 ? `Expires in ${minutes}m` : `Expires in ${Math.floor(minutes / 60)}h`;
}
