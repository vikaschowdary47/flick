import { supabase } from "./supabase";

// Image thumbnails (~200px JPEG), shared with the phone app: the uploading
// device stores one at <user_id>/thumbs/<uuid>.jpg; other devices download
// only that for the image grid.

const THUMB_WIDTH = 200;
const THUMB_QUALITY = 0.7;

// Make and upload a thumbnail. Returns its storage path, or null when the
// image can't be decoded here (e.g. HEIC); the upload goes ahead without.
export async function uploadThumbnail(userId: string, image: Blob): Promise<string | null> {
  if (!supabase) {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(image);
    const scale = Math.min(1, THUMB_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", THUMB_QUALITY),
    );
    if (!jpeg) {
      return null;
    }
    const path = `${userId}/thumbs/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("flick-files")
      .upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
    return error ? null : path;
  } catch (error: unknown) {
    console.warn("Could not make a thumbnail:", error);
    return null;
  }
}

// Thumbnails downloaded this session, as blob: URLs (kept in memory only).
const urls = new Map<string, Promise<string | null>>();

export function thumbnailUrl(thumbPath: string): Promise<string | null> {
  const cached = urls.get(thumbPath);
  if (cached) {
    return cached;
  }
  const job = (async () => {
    if (!supabase) {
      return null;
    }
    const { data, error } = await supabase.storage.from("flick-files").download(thumbPath);
    return error || !data ? null : URL.createObjectURL(data);
  })();
  urls.set(thumbPath, job);
  return job;
}
