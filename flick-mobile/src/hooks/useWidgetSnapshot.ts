import { useEffect, useRef } from "react";
import { widgetsBridge } from "../../modules/flick-widgets";
import type { ClipRow } from "../lib/clips";
import { localThumbnail } from "../lib/thumbs";
import type { FileRow } from "../lib/types";
import { buildSnapshot, SNAPSHOT_ITEMS } from "../lib/widgetSnapshot";

const WRITE_DELAY_MS = 800; // coalesce bursts (e.g. a batch of uploads)

type Options = {
  files: FileRow[];
  clips: ClipRow[];
  senderOf: (deviceId: string | null) => string;
  homeEnabled: boolean;
  lockEnabled: boolean;
  showContentOnLockScreen: boolean;
};

// Keeps the widgets' snapshot in step with the app's lists, then asks the
// widgets to redraw. Only works in the development/App Store build (Expo Go
// has no widgets); there it does nothing.
export function useWidgetSnapshot({ files, clips, senderOf, homeEnabled, lockEnabled, showContentOnLockScreen }: Options) {
  const enabled = homeEnabled || lockEnabled;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All widgets off: write one empty "turned off" snapshot, then nothing.
  useEffect(() => {
    if (enabled || !widgetsBridge.available()) return;
    const off = buildSnapshot({ files: [], clips: [], senderOf, thumbs: {}, showContentOnLockScreen: false, homeEnabled: false, lockEnabled: false });
    void widgetsBridge
      .writeSnapshot(JSON.stringify(off))
      .then(() => widgetsBridge.pruneThumbnails([]))
      .then(() => widgetsBridge.reloadWidgets())
      .catch(() => {});
  }, [enabled, senderOf]);

  useEffect(() => {
    if (!enabled || !widgetsBridge.available()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          // Thumbnails for the image files the widget will show.
          const thumbs: Record<string, string> = {};
          const common = { senderOf, showContentOnLockScreen, homeEnabled, lockEnabled };
          const firstPass = buildSnapshot({ files, clips, thumbs, ...common });
          for (const item of firstPass.items.slice(0, SNAPSHOT_ITEMS)) {
            const file = item.type === "image" ? files.find((f) => f.id === item.id) : undefined;
            if (!file?.thumb_path) continue;
            const local = await localThumbnail(file.id, file.thumb_path);
            if (!local) continue;
            const name = await widgetsBridge.saveThumbnail(file.id, local);
            if (name) thumbs[file.id] = name;
          }
          const snapshot = buildSnapshot({ files, clips, thumbs, ...common });
          await widgetsBridge.writeSnapshot(JSON.stringify(snapshot));
          await widgetsBridge.pruneThumbnails(Object.values(thumbs));
          widgetsBridge.reloadWidgets();
        } catch (err) {
          console.warn("Flick couldn't update the widgets", err);
        }
      })();
    }, WRITE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [files, clips, senderOf, enabled, homeEnabled, lockEnabled, showContentOnLockScreen]);
}
