import { useEffect, useState } from "react";

// Which way the one Flick window is shown right now (set by the main process):
// the menu bar popover, the floating panel, or the resizable main window.
export type WindowMode = "popover" | "panel" | "main";

export function useWindowMode(): WindowMode {
  const [mode, setMode] = useState<WindowMode>("popover");
  useEffect(() => {
    void window.flick.getWindowMode().then(setMode);
    return window.flick.onWindowMode(setMode);
  }, []);
  return mode;
}
