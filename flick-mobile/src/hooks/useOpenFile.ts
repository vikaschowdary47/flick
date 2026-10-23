import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { Directory, File } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { cacheEpoch, cacheEpochActive, cachedCopy, fileCacheDir, pruneCache, touchCachedCopy } from "../lib/cache";
import { isExpired } from "../lib/format";
import { resolveMimeType } from "../lib/mime";
import { FILES_BUCKET, supabase } from "../lib/supabase";
import type { FileRow } from "../lib/types";

const LINK_SECONDS = 60 * 5;
const FLAG_GRANT_READ_URI_PERMISSION = 1; // Android Intent flag

export type OpenMode = "preview" | "share";

// What the in-app viewer (iPhone Preview) shows.
export type ViewerKind = "image" | "document" | "source";

export type ViewerState = {
  file: FileRow;
  uri: string; // our cached copy
  mimeType: string;
  kind: ViewerKind;
  text?: string; // HTML source, shown as plain text
  folder: Directory; // protected from Clear cache while the viewer is open
};

const OFFICE = /\.(docx?|xlsx?|pptx?)$/i;

// iPhone Preview: images zoom, PDFs/text/Office go in a WebView, HTML is shown
// as source text only (never rendered). Anything else uses the share sheet.
function viewerKind(mimeType: string, name: string): ViewerKind | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "text/html" || /\.html?$/i.test(name)) return "source";
  if (mimeType === "application/pdf" || mimeType === "text/plain" || OFFICE.test(name)) return "document";
  return null;
}

class ExpiredError extends Error {}
class NoAppError extends Error {}

function describeOpenError(error: unknown): {
  message: string;
  status?: unknown;
  code?: unknown;
  name?: unknown;
} {
  if (typeof error !== "object" || error === null) return { message: String(error) };
  const value = error as {
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    name?: unknown;
  };
  return {
    message: value.message ? String(value.message) : String(error),
    status: value.status ?? value.statusCode,
    code: value.code,
    name: value.name,
  };
}

// Open the file's cached copy (downloading it only if there isn't one), then
// hand it to the system. Copies stay cached; cache.ts removes them by its
// rules (file gone, 24 hours unused, 150 MB cap, sign-out, Clear cache).
// - Share: the share sheet on both platforms (expo-sharing).
// - Preview: iOS shows Quick Look at the top of the share sheet; Android opens
//   it with a VIEW intent ("Open with"), falling back to the share sheet when
//   no app can open that type.
export function useOpenFile() {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const run = useCallback(async (file: FileRow, mode: OpenMode) => {
    const epoch = cacheEpoch();
    const assertActive = () => { if (!cacheEpochActive(epoch)) throw new Error("Account cache is closed."); };
    setOpeningId(file.id);
    setError(null);
    const folder = fileCacheDir(file.id);
    const mimeType = resolveMimeType(file.mime_type, file.name);
    let stage = "cache";
    let fresh: File | null = null; // a download in progress, removed if it fails
    try {
      assertActive();
      if (isExpired(file, Date.now())) {
        throw new ExpiredError();
      }

      let downloaded = cachedCopy(file.id);
      if (!downloaded) {
        stage = "signed-url";
        const { data, error: linkError } = await supabase.storage
          .from(FILES_BUCKET)
          .createSignedUrl(file.storage_path, LINK_SECONDS);
        if (linkError || !data?.signedUrl) {
          console.warn("Flick signed URL failed", {
            storagePath: file.storage_path,
            ...describeOpenError(linkError ?? new Error("No signed URL returned")),
          });
          throw /not.?found|404|object/i.test(linkError?.message ?? "") ? new ExpiredError() : linkError ?? new Error("No link");
        }
        assertActive();
        folder.create({ intermediates: true, idempotent: true });
        fresh = new File(folder, file.name.replace(/[/\\:]/g, "_") || "file");
        stage = "download";
        try {
          downloaded = await File.downloadFileAsync(data.signedUrl, fresh);
        } catch (downloadError) {
          // Some Expo/iOS builds surface a blank FileSystem error even when
          // the signed URL is valid. Fetch the URL directly so a valid file
          // still opens, while preserving the HTTP status when it is not.
          console.warn("Flick file download failed; retrying signed URL", {
            storagePath: file.storage_path,
            ...describeOpenError(downloadError),
          });
          stage = "download-fallback";
          const response = await fetch(data.signedUrl);
          if (!response.ok) {
            const statusError = new Error(`Storage download returned HTTP ${response.status}`);
            Object.assign(statusError, { status: response.status });
            throw statusError;
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          assertActive();
          fresh.write(bytes);
          downloaded = fresh;
        }
        assertActive();
        fresh = null;
      }
      assertActive();
      touchCachedCopy(file.id);
      pruneCache({ protectUris: [folder.uri] }); // keep the cache under 150 MB

      setOpeningId(null); // the system UI is up; stop the "Downloading…" state

      const kind = viewerKind(mimeType, file.name);
      if (Platform.OS === "ios" && mode === "preview" && kind) {
        stage = "viewer";
        const text = kind === "source" ? await downloaded.text() : undefined;
        setViewer({ file, uri: downloaded.uri, mimeType, kind, text, folder });
        return;
      }

      if (Platform.OS === "android" && mode === "preview") {
        try {
          stage = "intent";
          // Other apps can't read file:// in our cache; give them a content:// uri.
          const contentUri = await getContentUriAsync(downloaded.uri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
            data: contentUri,
            type: mimeType,
            flags: FLAG_GRANT_READ_URI_PERMISSION,
          });
          return;
        } catch (viewError) {
          // No app for this type (e.g. some zips): offer the share sheet instead.
          if (!/no activity|activitynotfound|not found/i.test(String(viewError))) throw viewError;
        }
      }

      if (!(await Sharing.isAvailableAsync())) throw new NoAppError();
      stage = "share";
      await Sharing.shareAsync(downloaded.uri, {
        mimeType,
        dialogTitle: "Share file",
        UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
      });
    } catch (err) {
      const details = describeOpenError(err);
      const message = details.message;
      const status = details.status;
      console.warn("Flick open failed", {
        mode,
        name: file.name,
        mimeType,
        storagePath: file.storage_path,
        stage,
        ...details,
      });
      setError(
        err instanceof ExpiredError || /not.?found|404/i.test(message)
          ? `"${file.name}" has expired and isn't available anymore.`
          : err instanceof NoAppError
            ? "Sharing isn't available on this device."
            : status === 401 || status === 403
              ? "Your session expired. Sign in again."
              : /network|fetch|offline|timed? ?out/i.test(message)
              ? "Connection dropped. Try again."
              : `Couldn't open "${file.name}" (${stage} failed).`,
      );
    } finally {
      setOpeningId(null);
      // A half-finished download is useless; a complete copy stays cached.
      if (fresh) deleteFile(fresh);
    }
  }, []);

  // Viewer: share the copy it already has, without downloading again.
  const shareFromViewer = useCallback(async () => {
    if (!viewer) return;
    try {
      await Sharing.shareAsync(viewer.uri, { mimeType: viewer.mimeType, dialogTitle: "Share file" });
    } catch {
      setError(`Couldn't share "${viewer.file.name}".`);
    }
  }, [viewer]);

  const closeViewer = useCallback(() => {
    setViewer(null); // the copy stays cached for next time
  }, []);

  const viewerFailed = useCallback(
    (file: FileRow) => {
      closeViewer();
      setError(`Couldn't open "${file.name}".`);
    },
    [closeViewer],
  );

  const open = useCallback((file: FileRow) => run(file, "preview"), [run]);
  const share = useCallback((file: FileRow) => run(file, "share"), [run]);

  return { open, share, openingId, error, viewer, closeViewer, shareFromViewer, viewerFailed };
}

function deleteFile(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // the OS clears the cache eventually anyway
  }
}
