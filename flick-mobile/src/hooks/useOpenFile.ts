import { useCallback, useState } from "react";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { FILES_BUCKET, supabase } from "../lib/supabase";
import type { FileRow } from "../lib/types";

const LINK_SECONDS = 60 * 5;

// Like Files, Dropbox or WhatsApp: download the file to the phone, then open
// the iOS share sheet. It shows a Quick Look preview at the top and lets the
// user pick the app (Files, Photos, Mail, AirDrop, Pages…).
export function useOpenFile() {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (file: FileRow) => {
    setOpeningId(file.id);
    setError(null);
    // A fresh folder per open keeps the real file name (shown in the sheet)
    // without clashing with another file of the same name.
    const folder = new Directory(Paths.cache, "flick-open", Crypto.randomUUID());
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("sharing unavailable");
      }

      const { data, error: linkError } = await supabase.storage
        .from(FILES_BUCKET)
        .createSignedUrl(file.storage_path, LINK_SECONDS);
      if (linkError || !data?.signedUrl) throw linkError ?? new Error("No link");

      folder.create({ intermediates: true, idempotent: true });
      const destination = new File(folder, file.name.replace(/[/\\:]/g, "_") || "file");
      const downloaded = await File.downloadFileAsync(data.signedUrl, destination);

      setOpeningId(null); // the sheet is up; stop the "Opening…" state
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: file.mime_type ?? undefined,
        dialogTitle: file.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        /not found|404/i.test(message)
          ? `"${file.name}" isn't in storage anymore.`
          : /network|fetch|offline|timed? ?out/i.test(message)
            ? "Connection dropped. Try again."
            : /sharing unavailable/.test(message)
              ? "Opening files isn't available on this device."
              : `Couldn't open "${file.name}".`,
      );
    } finally {
      setOpeningId(null);
      // shareAsync resolves when the sheet closes, so the copy can go.
      try {
        if (folder.exists) folder.delete();
      } catch {
        // cache is cleared by iOS eventually anyway
      }
    }
  }, []);

  return { open, openingId, error };
}
