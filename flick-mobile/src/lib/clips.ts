// Clips: short text or a link shared to all your devices (24 hours, like files).

export const CLIP_MAX_CHARS = 10000;

export type ClipKind = "text" | "link";

export type ClipRow = {
  id: string;
  user_id: string;
  device_id: string | null;
  kind: ClipKind;
  content: string;
  created_at: string;
  expires_at: string;
};

export function clipKind(content: string): ClipKind {
  return /^https?:\/\/\S+$/i.test(content.trim()) ? "link" : "text";
}

// "github.com" for https://www.github.com/…; the raw text if it won't parse.
export function siteName(url: string): string {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url.trim());
  return match ? match[1].replace(/^www\./i, "") : url;
}

export function formatAgo(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
