import { useEffect, useState } from "react";
import { CLIPBOARD_ENABLED } from "../config";

// Clipboard sharing, saved per device by the main process in
// <userData>/settings.json (not synced). Off by default. Changes from the
// tray menu arrive here too, so the UI updates without a restart.
export function useClipboardSetting() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!CLIPBOARD_ENABLED) {
      return;
    }
    void window.flick.getClipboardSharing().then(setOn);
    return window.flick.onClipboardSharingChanged(setOn);
  }, []);

  function setSharing(value: boolean): void {
    setOn(value);
    void window.flick.setClipboardSharing(value);
  }

  return { sharingOn: on, clipsActive: CLIPBOARD_ENABLED && on, setSharing };
}
