import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { cacheEpoch, cacheEpochActive } from "./cache";
import { FILES_BUCKET, supabase } from "./supabase";

// Image thumbnails (~200px JPEG). The uploading device makes one and stores
// it at <user_id>/thumbs/<uuid>.jpg; other devices download only that for
// grids and widgets. Downloaded thumbnails live in flick-thumbs/<file id>.jpg
// and follow the cache rules in cache.ts.

export const THUMB_DIR = "flick-thumbs";
const THUMB_WIDTH = 200;
const THUMB_QUALITY = 0.7;
const LINK_SECONDS = 60 * 5;

// Make and upload a thumbnail for an image. Returns its storage path, or
// null if this image can't be thumbnailed (the upload goes ahead without).
export async function uploadThumbnail(userId: string, sourceUri: string): Promise<string | null> {
  let made: File | null = null;
  try {
    const rendered = await ImageManipulator.manipulate(sourceUri).resize({ width: THUMB_WIDTH }).renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: THUMB_QUALITY });
    made = new File(saved.uri);
    const path = `${userId}/thumbs/${Crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(FILES_BUCKET)
      .upload(path, await made.arrayBuffer(), { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    return path;
  } catch (err) {
    const detail = describeError(err);
    console.warn("Flick couldn't make a thumbnail", { sourceUri, ...detail });
    return null;
  } finally {
    try {
      if (made?.exists) made.delete();
    } catch {
      // cache is cleared by the OS eventually anyway
    }
  }
}

function describeError(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) return { message: String(error) };
  const value = error as { message?: unknown; status?: unknown; statusCode?: unknown; code?: unknown; name?: unknown };
  return {
    message: value.message ?? String(error),
    status: value.status ?? value.statusCode,
    code: value.code,
    name: value.name,
  };
}

const inflight = new Map<string, Promise<string | null>>();

// Local uri of a file's thumbnail, downloading it once if needed.
export function localThumbnail(fileId: string, thumbPath: string): Promise<string | null> {
  const epoch = cacheEpoch();
  if (!cacheEpochActive(epoch)) return Promise.resolve(null);
  const target = new File(new Directory(Paths.cache, THUMB_DIR), `${fileId}.jpg`);
  if (target.exists && (target.size ?? 0) > 0) return Promise.resolve(target.uri);
  const pending = inflight.get(fileId);
  if (pending) return pending;
  const job = (async () => {
    try {
      const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(thumbPath, LINK_SECONDS);
      if (error || !data?.signedUrl) return null;
      if (!cacheEpochActive(epoch)) return null;
      new Directory(Paths.cache, THUMB_DIR).create({ intermediates: true, idempotent: true });
      const downloaded = await File.downloadFileAsync(data.signedUrl, target);
      if (!cacheEpochActive(epoch)) { if (downloaded.exists) downloaded.delete(); return null; }
      return downloaded.uri;
    } catch {
      return null;
    } finally {
      inflight.delete(fileId);
    }
  })();
  inflight.set(fileId, job);
  return job;
}
