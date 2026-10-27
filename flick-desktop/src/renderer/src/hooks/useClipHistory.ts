import { useEffect, useState } from "react";
import type { ClipHistoryState } from "../../../shared/appSettings";

// This computer's clipboard history (kept by the main process, never synced).
export function useClipHistory(): ClipHistoryState & {
  setEnabled: (on: boolean) => void;
  remove: (id: string) => void;
  pin: (id: string, pinned: boolean) => void;
  clear: () => void;
} {
  const [state, setState] = useState<ClipHistoryState>({ enabled: true, entries: [] });
  useEffect(() => {
    let active = true;
    void window.flick.getClipHistory().then((next) => { if (active && next) setState(next); }).catch(() => {});
    const off = window.flick.onClipHistory((next) => { if (next) setState(next); });
    return () => {
      active = false;
      off();
    };
  }, []);
  return {
    ...state,
    setEnabled: (on) => void window.flick.setClipHistoryEnabled(on).then((next) => next && setState(next)),
    remove: (id) => void window.flick.removeClipHistoryEntry(id).then((next) => next && setState(next)),
    pin: (id, pinned) => void window.flick.pinClipHistoryEntry(id, pinned).then((next) => next && setState(next)),
    clear: () => void window.flick.clearClipHistory().then((next) => next && setState(next)),
  };
}
