import { useCallback, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
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

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const file = new File(asset.uri);
      const size = asset.size ?? file.size ?? 0;
      picked = {
        name: asset.name,
        size,
        mimeType: asset.mimeType ?? "application/octet-stream",
      };

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

      // RN can't upload a File/Blob directly, so send the raw bytes.
      const bytes = await file.arrayBuffer();
      const storagePath = `${userId}/${Crypto.randomUUID()}-${safeStorageName(picked.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(FILES_BUCKET)
        .upload(storagePath, bytes, { contentType: picked.mimeType, upsert: false });
      if (uploadError) throw uploadError;

      // Inserting the row is what makes the file appear on the laptop.
      const { error: insertError } = await supabase.from("files").insert({
        user_id: userId,
        name: picked.name,
        size,
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
      setState({ kind: "error", file: picked, message: friendlyUploadError(error) });
    } finally {
      busy.current = false;
    }
  }, [onUploaded]);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  const clearLimit = useCallback(() => setLimitHit(null), []);

  return { state, pickAndUpload, reset, limitHit, clearLimit };
}

function friendlyUploadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/network|fetch|timed? ?out/i.test(message)) return "Connection dropped. Check your Wi-Fi and try again.";
  if (/jwt|token|unauthori[sz]ed|row-level security/i.test(message)) return "Your session expired. Sign in again.";
  if (/too large|payload|exceeded/i.test(message)) return "That file is too big for Flick (50 MB max).";
  return "Couldn't flick that file. Try again.";
}
