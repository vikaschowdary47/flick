export type PlatformKey = "mac" | "windows" | "ios" | "android" | "microsoft";
export type PlatformStatus = "live" | "coming_soon" | "hidden";

export type PlatformRow = {
  key: PlatformKey;
  label: string;
  status: PlatformStatus;
  url: string | null;
  storage_path: string | null;
  version: string | null;
  release_notes: string | null;
  sha256: string | null;
  size_bytes: number | null;
  download_count: number;
  updated_at: string;
};

// Platforms where an installer file can be uploaded; the others are store links only.
export const UPLOADABLE: PlatformKey[] = ["mac", "windows"];
export const PLATFORM_ORDER: PlatformKey[] = ["mac", "windows", "microsoft", "ios", "android"];

export function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function isWebUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
