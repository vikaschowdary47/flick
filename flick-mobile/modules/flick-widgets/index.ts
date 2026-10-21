import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// iOS bridge to the widgets (App Group). Missing in Expo Go and on Android
// (for now), where every call is a no-op.
type FlickWidgetsNative = {
  isAvailable(): boolean;
  writeSnapshot(json: string): Promise<void>;
  saveThumbnail(fileId: string, sourceUri: string): Promise<string>;
  pruneThumbnails(keep: string[]): Promise<void>;
  reloadWidgets(): void;
  clear(): Promise<void>;
  startLiveActivity(count: number, deviceName: string): Promise<void>;
  endLiveActivity(): Promise<void>;
};

const native = Platform.OS === "ios" ? requireOptionalNativeModule<FlickWidgetsNative>("FlickWidgets") : null;

export const widgetsBridge = {
  available: (): boolean => {
    try {
      return native?.isAvailable() ?? false;
    } catch {
      return false;
    }
  },
  writeSnapshot: (json: string) => native?.writeSnapshot(json) ?? Promise.resolve(),
  saveThumbnail: (fileId: string, sourceUri: string) =>
    native?.saveThumbnail(fileId, sourceUri) ?? Promise.resolve(null as string | null),
  pruneThumbnails: (keep: string[]) => native?.pruneThumbnails(keep) ?? Promise.resolve(),
  reloadWidgets: () => native?.reloadWidgets(),
  clear: () => native?.clear() ?? Promise.resolve(),
  startLiveActivity: (count: number, deviceName: string) =>
    native?.startLiveActivity(count, deviceName) ?? Promise.resolve(),
  endLiveActivity: () => native?.endLiveActivity() ?? Promise.resolve(),
};
