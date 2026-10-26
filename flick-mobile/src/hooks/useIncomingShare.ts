import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useShareIntent } from "expo-share-intent";
import type { SharedFile } from "./useUpload";

// Android share sheet: "Share → eqlShare" from any app opens eqlShare with the
// files (or text/link). iOS has its own share extension (targets/share), so this
// is Android-only.
export function useIncomingShare(
  ready: boolean,
  onFiles: (files: SharedFile[]) => void,
  onText: (text: string) => void,
) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: Platform.OS !== "android",
    resetOnBackground: true,
  });
  const handlers = useRef({ onFiles, onText });
  handlers.current = { onFiles, onText };

  useEffect(() => {
    // Wait until signed in and the device is registered, then handle it once.
    if (!ready || !hasShareIntent) return;
    const files = (shareIntent.files ?? []).map((file) => ({
      uri: file.path.startsWith("file://") || file.path.startsWith("content://") ? file.path : `file://${file.path}`,
      name: file.fileName ?? null,
      mimeType: file.mimeType ?? null,
      size: file.size ?? null,
    }));
    if (files.length > 0) {
      handlers.current.onFiles(files);
    } else {
      const text = (shareIntent.webUrl || shareIntent.text || "").trim();
      if (text) handlers.current.onText(text);
    }
    resetShareIntent();
  }, [ready, hasShareIntent, shareIntent, resetShareIntent]);
}
