import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { OPEN_DIR, pruneCache } from "../lib/cache";
import { FILE_LIFETIME_MS } from "../lib/format";
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
  folder: Directory; // deleted when the viewer closes
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

// Download the file into our own cache (a fresh folder keeps the real name
// without clashing), then hand it to the system:
// - Share: the share sheet on both platforms (expo-sharing).
// - Preview: iOS shows Quick Look at the top of the share sheet; Android opens
//   it with a VIEW intent ("Open with"), falling back to the share sheet when
//   no app can open that type.
export function useOpenFile() {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const run = useCallback(async (file: FileRow, mode: OpenMode) => {
    setOpeningId(file.id);
    setError(null);
    const folder = new Directory(Paths.cache, OPEN_DIR, file.id, Crypto.randomUUID());
    const mimeType = resolveMimeType(file.mime_type, file.name);
    let keepFolder = false; // the viewer owns the copy until it closes
    try {
      if (Date.now() > new Date(file.created_at).getTime() + FILE_LIFETIME_MS) {
        throw new ExpiredError();
      }

      const { data, error: linkError } = await supabase.storage
        .from(FILES_BUCKET)
        .createSignedUrl(file.storage_path, LINK_SECONDS);
      if (linkError || !data?.signedUrl) {
        throw /not.?found|404|object/i.test(linkError?.message ?? "") ? new ExpiredError() : linkError ?? new Error("No link");
      }

      folder.create({ intermediates: true, idempotent: true });
      const destination = new File(folder, file.name.replace(/[/\\:]/g, "_") || "file");
      const downloaded = await File.downloadFileAsync(data.signedUrl, destination);
      pruneCache({ protectUris: [folder.uri] }); // keep the cache under 150 MB

      setOpeningId(null); // the system UI is up; stop the "Downloading…" state

      const kind = viewerKind(mimeType, file.name);
      if (Platform.OS === "ios" && mode === "preview" && kind) {
        const text = kind === "source" ? await downloaded.text() : undefined;
        keepFolder = true;
        setViewer({ file, uri: downloaded.uri, mimeType, kind, text, folder });
        return;
      }

      if (Platform.OS === "android" && mode === "preview") {
        try {
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
      await Sharing.shareAsync(downloaded.uri, {
        mimeType,
        dialogTitle: "Share file",
        UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Flick open failed", { mode, name: file.name, mimeType, message });
      setError(
        err instanceof ExpiredError || /not.?found|404/i.test(message)
          ? `"${file.name}" has expired and isn't available anymore.`
          : err instanceof NoAppError
            ? "Sharing isn't available on this device."
            : /network|fetch|offline|timed? ?out/i.test(message)
              ? "Connection dropped. Try again."
              : `Couldn't open "${file.name}".`,
      );
    } finally {
      setOpeningId(null);
      // shareAsync resolves when the sheet closes and startActivityAsync when
      // the other app returns, so the copy can go. (Android may still be
      // reading it in rare cases; the cache is cleared by the OS anyway.)
      if (!keepFolder) deleteFolder(folder);
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
    setViewer((current) => {
      if (current) deleteFolder(current.folder);
      return null;
    });
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

function deleteFolder(folder: Directory) {
  try {
    if (folder.exists) folder.delete();
  } catch {
    // the OS clears the cache eventually anyway
  }
}
