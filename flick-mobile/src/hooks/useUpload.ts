import { useCallback, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { FILES_BUCKET, MAX_FILE_BYTES, supabase } from "../lib/supabase";
import { formatBytes, safeStorageName } from "../lib/format";
import { deleteIfCached } from "../lib/cache";
import { limitFromError, type LimitKind } from "../lib/limits";
import { MIME_BY_EXTENSION, resolveMimeType } from "../lib/mime";
import type { PickedFile, UploadState } from "../lib/types";

// One picked item, before it's read and uploaded.
type Candidate = {
  uri: string;
  name: string;
  mimeType: string;
  size: number; // 0 when the picker didn't say
};

export type UploadSource = "photos" | "files" | "camera";

export function useUpload(onUploaded?: () => void, deviceId?: string | null) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [limitHit, setLimitHit] = useState<LimitKind | null>(null);
  const busy = useRef(false);
  const deviceIdRef = useRef(deviceId ?? null);
  deviceIdRef.current = deviceId ?? null;

  // Uploads one file: copy to our cache, read bytes, upload with an explicit
  // contentType, then insert the row (which is what the laptop listens for).
  const uploadOne = useCallback(async (candidate: Candidate, userId: string) => {
    let picked: PickedFile = { name: candidate.name, size: candidate.size, mimeType: candidate.mimeType };
    const debug = { platform: Platform.OS, uri: candidate.uri, name: candidate.name, mimeType: candidate.mimeType, size: candidate.size };
    let cached: File | null = null;
    try {
      if (picked.size > MAX_FILE_BYTES) throw new TooLargeError(picked.size);
      setState({ kind: "uploading", file: picked });

      let bytes: ArrayBuffer;
      try {
        cached = await copyToCache(candidate.uri, picked.name);
        bytes = await cached.arrayBuffer();
      } catch (copyError) {
        // Android Expo Go can refuse copies out of the picker's folder
        // ("Missing 'READ' permission"); content:// uris still read directly.
        if (!candidate.uri.startsWith("content://")) throw copyError;
        console.warn("Flick cache copy failed, reading directly", { ...debug, ...describeError(copyError) });
        bytes = await new File(candidate.uri).arrayBuffer();
      }
      if (bytes.byteLength === 0) throw new Error("empty file");
      if (bytes.byteLength > MAX_FILE_BYTES) throw new TooLargeError(bytes.byteLength);
      picked = { ...picked, size: bytes.byteLength };

      const storagePath = `${userId}/${Crypto.randomUUID()}-${safeStorageName(picked.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(FILES_BUCKET)
        .upload(storagePath, bytes, { contentType: picked.mimeType, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("files").insert({
        user_id: userId,
        name: picked.name,
        size: picked.size,
        mime_type: picked.mimeType,
        storage_path: storagePath,
        device_id: deviceIdRef.current, // the sender, for "from <device>"
      });
      if (insertError) {
        await supabase.storage.from(FILES_BUCKET).remove([storagePath]);
        throw insertError;
      }
      return { ok: true as const, picked };
    } catch (error) {
      if (!(error instanceof TooLargeError) && !limitFromError(error)) {
        console.warn("Flick upload failed", { ...debug, ...describeError(error) });
      }
      return { ok: false as const, picked, error };
    } finally {
      try {
        if (cached?.exists) cached.delete();
      } catch {
        // the OS clears the cache eventually anyway
      }
      // Picker/HEIC copies are only needed for the upload; don't keep originals.
      deleteIfCached(candidate.uri);
    }
  }, []);

  const pickAndUpload = useCallback(
    async (source: UploadSource = "files") => {
      if (busy.current) return;
      busy.current = true;
      try {
        let candidates: Candidate[] | null;
        try {
          candidates =
            source === "photos" ? await pickPhotos() : source === "camera" ? await takePhoto() : await pickFiles();
        } catch (error) {
          if (error instanceof PermissionError) {
            setState({ kind: "error", file: null, message: error.message });
            return;
          }
          throw error;
        }
        if (!candidates || candidates.length === 0) return;

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) {
          setState({ kind: "error", file: null, message: "Your session expired. Sign in again." });
          return;
        }

        // One at a time, so the card shows which file is on its way.
        let lastDone: PickedFile | null = null;
        const failures: { picked: PickedFile; error: unknown }[] = [];
        for (const candidate of candidates) {
          const result = await uploadOne(candidate, userId);
          if (result.ok) {
            lastDone = result.picked;
            onUploaded?.();
            continue;
          }
          // Over the free storage limit: stop and show the limit screen.
          const limit = limitFromError(result.error);
          if (limit) {
            setState({ kind: "idle" });
            setLimitHit(limit);
            return;
          }
          failures.push({ picked: result.picked, error: result.error });
        }

        if (failures.length === 0 && lastDone) {
          setState({ kind: "done", file: lastDone });
        } else if (failures.length > 0) {
          const first = failures[0];
          const message = friendlyUploadError(first.error);
          setState({
            kind: "error",
            file: first.picked,
            message:
              candidates.length > 1 ? `${failures.length} of ${candidates.length} didn't flick. ${message}` : message,
          });
        }
      } catch (error) {
        console.warn("Flick upload failed", describeError(error));
        setState({ kind: "error", file: null, message: friendlyUploadError(error) });
      } finally {
        busy.current = false;
      }
    },
    [onUploaded, uploadOne],
  );

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  const clearLimit = useCallback(() => setLimitHit(null), []);

  return { state, pickAndUpload, reset, limitHit, clearLimit };
}

class TooLargeError extends Error {
  constructor(public bytes: number) {
    super(`too large: ${bytes}`);
  }
}

class PermissionError extends Error {}

// Files: the existing document picker flow.
async function pickFiles(): Promise<Candidate[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Android: Expo Go only lets us read files inside our own scoped cache,
    // and the picker's copy lands outside it (Missing 'READ' permission).
    // So on Android keep the picker's content:// uri.
    copyToCacheDirectory: Platform.OS !== "android",
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const mimeType = resolveMimeType(asset.mimeType, normalizeName(asset.name));
  // Android providers can return names without an extension (e.g. "1000012345").
  const name = withExtension(normalizeName(asset.name), mimeType);
  return [{ uri: asset.uri, name, mimeType, size: asset.size ?? 0 }];
}

// Photos: the system photo picker (PHPicker on iOS, Android photo picker),
// which needs no library permission. Several photos and videos at once.
async function pickPhotos(): Promise<Candidate[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsMultipleSelection: true,
    quality: 1,
    // iOS: hand back JPEG instead of HEIC where it can.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;
  return Promise.all(result.assets.map(toCandidate));
}

// Take photo: camera permission is asked only here.
async function takePhoto(): Promise<Candidate[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new PermissionError(
      permission.canAskAgain
        ? "Flick needs the camera to take a photo."
        : "Camera access is off. Turn it on for Flick in Settings to take a photo.",
    );
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled) return null;
  return Promise.all(result.assets.map(toCandidate));
}

let photoCounter = 0;

// Photos become JPEG (HEIC/HEIF are converted); videos keep their type.
// The original filename is kept where the picker gives one.
async function toCandidate(asset: ImagePicker.ImagePickerAsset): Promise<Candidate> {
  const isVideo = asset.type === "video" || asset.type === "pairedVideo" || (asset.mimeType ?? "").startsWith("video/");
  const fallbackBase = `${isVideo ? "VID" : "IMG"}_${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}_${++photoCounter}`;
  const original = normalizeName(asset.fileName || fallbackBase);
  const mimeType = resolveMimeType(asset.mimeType, original);
  const size = asset.fileSize ?? 0;

  if (isVideo) {
    return { uri: asset.uri, name: withExtension(original, mimeType), mimeType, size };
  }
  if (mimeType === "image/jpeg") {
    return { uri: asset.uri, name: withJpegExtension(original), mimeType, size };
  }
  if (/heic|heif/.test(mimeType) || /\.(heic|heif)$/.test(original)) {
    const image = await ImageManipulator.manipulate(asset.uri).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
    return { uri: saved.uri, name: withJpegExtension(original), mimeType: "image/jpeg", size: 0 };
  }
  // PNG, GIF, WebP… keep as they are.
  return { uri: asset.uri, name: withExtension(original, mimeType), mimeType, size };
}

function withJpegExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.jpg`;
}

// Lowercase the extension (IMG_0001.JPG -> IMG_0001.jpg), keep the rest.
function normalizeName(name: string): string {
  const trimmed = name.trim() || "file";
  const dot = trimmed.lastIndexOf(".");
  return dot > 0 ? trimmed.slice(0, dot) + trimmed.slice(dot).toLowerCase() : trimmed;
}

function withExtension(name: string, mimeType: string): string {
  if (name.lastIndexOf(".") > 0) return name;
  const extension = Object.keys(MIME_BY_EXTENSION).find((key) => MIME_BY_EXTENSION[key] === mimeType);
  return extension ? `${name}.${extension}` : name;
}

// For content:// URIs (Android SAF/photo providers): copy into our cache.
// copy() can return a promise on Android, so await it before reading.
async function copyToCache(uri: string, name: string): Promise<File> {
  const folder = new Directory(Paths.cache, "flick-upload", Crypto.randomUUID());
  folder.create({ intermediates: true, idempotent: true });
  const destination = new File(folder, safeStorageName(name));
  await Promise.resolve(new File(uri).copy(destination));
  return destination;
}

function describeError(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) return { message: String(error) };
  const e = error as { message?: unknown; status?: unknown; statusCode?: unknown; code?: unknown; name?: unknown };
  return { message: e.message, status: e.status ?? e.statusCode, code: e.code, name: e.name };
}

function friendlyUploadError(error: unknown): string {
  if (error instanceof TooLargeError)
    return `That one's ${formatBytes(error.bytes)}. Flick handles files up to ${formatBytes(MAX_FILE_BYTES)}.`;
  const { message: raw, status } = describeError(error);
  const message = String(raw ?? "");
  if (/network|fetch|timed? ?out/i.test(message)) return "Connection dropped. Check your Wi-Fi and try again.";
  if (/jwt|token|unauthori[sz]ed|row-level security/i.test(message) || status === 401 || status === 403)
    return "Your session expired. Sign in again.";
  if (/too large|payload|exceeded/i.test(message) || status === 413) return "That file is too big for Flick (50 MB max).";
  if (/mime|content.?type|not supported/i.test(message) || status === 415) return "Flick couldn't accept that file type.";
  if (/empty file/.test(message)) return "That file looks empty. Try picking it again.";
  if (/copy|read|no such file|permission|not found|unable to/i.test(message))
    return "Couldn't read that file from your phone. Try saving it to Files first, then flick it.";
  if (/duplicate|already exists/i.test(message)) return "That file is already flicking. Try again in a moment.";
  return message ? `Couldn't flick that file: ${message}` : "Couldn't flick that file. Try again.";
}
