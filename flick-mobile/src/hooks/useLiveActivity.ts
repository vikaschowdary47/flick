import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { widgetsBridge } from "../../modules/flick-widgets";
import type { FileRow } from "../lib/types";

// "N new files from <device>" on the Lock Screen / Dynamic Island.
// Without push, iOS only lets the app start it while it's in the
// foreground, so: when Flick goes to the background with files from other
// devices you haven't seen, start (or update) it; when you open Flick, the
// files are seen and it ends. It goes stale after 4 hours.
const SEEN_KEY = "flick.liveActivity.seenAt.v1";

export function useLiveActivity(options: {
  files: FileRow[];
  thisDeviceId: string | null;
  deviceNames: Record<string, string>;
  enabled: boolean;
}) {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (!options.enabled || !widgetsBridge.available()) return;
    let seenAt = Date.now();
    AsyncStorage.getItem(SEEN_KEY)
      .then((value) => {
        if (value) seenAt = Number(value) || seenAt;
      })
      .catch(() => {});

    const markSeen = () => {
      seenAt = Date.now();
      AsyncStorage.setItem(SEEN_KEY, String(seenAt)).catch(() => {});
      void widgetsBridge.endLiveActivity();
    };
    markSeen(); // opening Flick counts as seeing the files

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        markSeen();
        return;
      }
      if (state !== "background") return;
      const { files, thisDeviceId, deviceNames } = latest.current;
      const unseen = files.filter(
        (file) => file.device_id !== thisDeviceId && new Date(file.created_at).getTime() > seenAt,
      );
      if (unseen.length === 0) return;
      const from = unseen[0].device_id ? deviceNames[unseen[0].device_id] ?? "" : "";
      void widgetsBridge.startLiveActivity(unseen.length, from).catch(() => {});
    });
    return () => subscription.remove();
  }, [options.enabled]);
}
