// File types by extension, for when a picker or a stored row has no usable type.
export const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  html: "text/html",
  htm: "text/html",
  zip: "application/zip",
  txt: "text/plain",
  mov: "video/quicktime",
  mp4: "video/mp4",
};

// Use the picker's type unless it's missing or generic, then fall back to the extension.
export function resolveMimeType(mimeType: string | null | undefined, name: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType.toLowerCase();
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}
