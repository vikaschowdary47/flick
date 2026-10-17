export interface CloudFileRow {
  id: string;
  user_id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  delivered_at: string | null;
}

export interface CloudFile extends CloudFileRow {
  downloadState: "downloading" | "ready" | "error" | "delivered";
  localFileId?: string;
  downloadError?: string;
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
