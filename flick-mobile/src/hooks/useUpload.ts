import { useCallback, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { FILES_BUCKET, MAX_FILE_BYTES, supabase } from "../lib/supabase";
import { formatBytes, safeStorageName } from "../lib/format";
import { limitFromError, type LimitKind } from "../lib/limits";
import type { PickedFile, UploadState } from "../lib/types";

export function useUpload(onUploaded?: () => void) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [limitHit, setLimitHit] = useState<LimitKind | null>(null);
  const busy = useRef(false);

  const pickAndUpload = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    let picked: PickedFile | null = null;
    let debug: Record<string, unknown> = {};
    let cached: File | null = null;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const name = normalizeName(asset.name);
      picked = {
        name,
        size: asset.size ?? 0,
        mimeType: resolveMimeType(asset.mimeType, name),
      };
      debug = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null, size: asset.size ?? null };
      const size = picked.size;

      if (size > MAX_FILE_BYTES) {
        setState({
          kind: "error",
          file: picked,
          message: `That one's ${formatBytes(size)}. Flick handles files up to ${formatBytes(MAX_FILE_BYTES)}.`,
        });
        return;
      }

      setState({ kind: "uploading", file: picked });

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setState({ kind: "error", file: picked, message: "Your session expired. Sign in again." });
        return;
      }

      // Photos can come back as ph:// / assets-library:// or iCloud-backed
      // URIs that can't be read directly. Copy to our own cache file first,
      // then read its bytes (never fetch(uri).blob(), which RN can't upload).
      cached = copyToCache(asset.uri, picked.name);
      const bytes = await cached.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("empty file");
      if (!picked.size) picked = { ...picked, size: bytes.byteLength };
      if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("payload too large");
      const storagePath = `${userId}/${Crypto.randomUUID()}-${safeStorageName(picked.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(FILES_BUCKET)
        .upload(storagePath, bytes, { contentType: picked.mimeType, upsert: false });
      if (uploadError) throw uploadError;

      // Inserting the row is what makes the file appear on the laptop.
      const { error: insertError } = await supabase.from("files").insert({
        user_id: userId,
        name: picked.name,
        size: picked.size,
        mime_type: picked.mimeType,
        storage_path: storagePath,
      });
      if (insertError) {
        await supabase.storage.from(FILES_BUCKET).remove([storagePath]);
        throw insertError;
      }

      setState({ kind: "done", file: picked });
      onUploaded?.();
    } catch (error) {
      // Over the free storage limit (enforced by the database): show the limit screen.
      const limit = limitFromError(error);
      if (limit) {
        setState({ kind: "idle" });
        setLimitHit(limit);
        return;
      }
      console.warn("Flick upload failed", { ...debug, ...describeError(error) });
      setState({ kind: "error", file: picked, message: friendlyUploadError(error) });
    } finally {
      busy.current = false;
      try {
        if (cached?.exists) cached.delete();
      } catch {
        // cache is cleared by iOS eventually anyway
      }
    }
  }, [onUploaded]);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  const clearLimit = useCallback(() => setLimitHit(null), []);

  return { state, pickAndUpload, reset, limitHit, clearLimit };
}

// Lowercase the extension (IMG_0001.JPG -> IMG_0001.jpg), keep the rest.
function normalizeName(name: string): string {
  const trimmed = name.trim() || "file";
  const dot = trimmed.lastIndexOf(".");
  return dot > 0 ? trimmed.slice(0, dot) + trimmed.slice(dot).toLowerCase() : trimmed;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  html: "text/html",
  txt: "text/plain",
};

// Use the picker's type unless it's missing or generic, then fall back to the extension.
function resolveMimeType(mimeType: string | null | undefined, name: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType.toLowerCase();
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

function copyToCache(uri: string, name: string): File {
  const folder = new Directory(Paths.cache, "flick-upload", Crypto.randomUUID());
  folder.create({ intermediates: true, idempotent: true });
  const destination = new File(folder, safeStorageName(name));
  new File(uri).copy(destination);
  return destination;
}

function describeError(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) return { message: String(error) };
  const e = error as { message?: unknown; status?: unknown; statusCode?: unknown; code?: unknown; name?: unknown };
  return { message: e.message, status: e.status ?? e.statusCode, code: e.code, name: e.name };
}

function friendlyUploadError(error: unknown): string {
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
