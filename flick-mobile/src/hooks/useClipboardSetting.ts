import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CLIPBOARD_ENABLED } from "../lib/config";

// Settings → Clipboard sharing. Saved on this device only (AsyncStorage key
// below), not synced. Off by default.
const KEY = "flick.clipboardSharing.v1";

export function useClipboardSetting() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!CLIPBOARD_ENABLED) return;
    AsyncStorage.getItem(KEY)
      .then((value) => setOn(value === "on"))
      .catch(() => {});
  }, []);

  const setSharing = useCallback((value: boolean) => {
    setOn(value);
    AsyncStorage.setItem(KEY, value ? "on" : "off").catch(() => {});
  }, []);

  // Clips are only active when both the developer flag and this setting are on.
  return { sharingOn: on, clipsActive: CLIPBOARD_ENABLED && on, setSharing };
}
