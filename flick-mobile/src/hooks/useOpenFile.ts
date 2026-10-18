import { useCallback, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { FILES_BUCKET, supabase } from "../lib/supabase";
import type { FileRow } from "../lib/types";

const LINK_SECONDS = 60 * 5;

export function useOpenFile() {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (file: FileRow) => {
    setOpeningId(file.id);
    setError(null);
    try {
      // Private bucket: make a short-lived link, then preview it in an in-app browser.
      const { data, error: linkError } = await supabase.storage
        .from(FILES_BUCKET)
        .createSignedUrl(file.storage_path, LINK_SECONDS);
      if (linkError || !data?.signedUrl) throw linkError ?? new Error("No link");
      await WebBrowser.openBrowserAsync(data.signedUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        /not found/i.test(message)
          ? `"${file.name}" isn't in storage anymore.`
          : /network|fetch/i.test(message)
            ? "Connection dropped. Try again."
            : `Couldn't open "${file.name}".`,
      );
    } finally {
      setOpeningId(null);
    }
  }, []);

  return { open, openingId, error };
}
