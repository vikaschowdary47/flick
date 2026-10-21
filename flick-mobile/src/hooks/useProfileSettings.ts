import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useFeatureFlags } from "./useFeatureFlags";

export type Density = "comfy" | "compact";

// The user's synced settings on their profile row:
// - ui_density (Comfy / Compact, default compact)
// - clipboard_enabled (Clipboard sharing, default on; only used when the
//   "clipboard" feature flag is on)
// Density is also cached on the device so the app opens in the right
// density before the profile loads.
const DENSITY_CACHE = "flick.uiDensity.v1";

type Row = { ui_density?: unknown; clipboard_enabled?: unknown };

export function useProfileSettings(userId: string) {
  const flags = useFeatureFlags();
  const [density, setDensityState] = useState<Density>("compact");
  // null until loaded: clips stay hidden rather than flashing on.
  const [clipboardOn, setClipboardOn] = useState<boolean | null>(null);

  const applyRow = useCallback((row: Row) => {
    if (row.ui_density === "comfy" || row.ui_density === "compact") {
      setDensityState(row.ui_density);
      AsyncStorage.setItem(DENSITY_CACHE, row.ui_density).catch(() => {});
    }
    if (typeof row.clipboard_enabled === "boolean") setClipboardOn(row.clipboard_enabled);
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("ui_density, clipboard_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return;
    applyRow(data ?? { clipboard_enabled: true });
  }, [userId, applyRow]);

  useEffect(() => {
    AsyncStorage.getItem(DENSITY_CACHE)
      .then((value) => {
        if (value === "comfy" || value === "compact") setDensityState(value);
      })
      .catch(() => {});
    // The clipboard setting used to be saved per device; that copy is unused.
    AsyncStorage.removeItem("flick.clipboardSharing.v1").catch(() => {});
  }, []);

  useEffect(() => {
    void load();
    // Changes made on another device.
    const channel = supabase
      .channel(`profile-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        (payload) => applyRow(payload.new as Row),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      supabase.removeChannel(channel);
      appState.remove();
    };
  }, [userId, load, applyRow]);

  const save = useCallback(
    (changes: { ui_density?: Density; clipboard_enabled?: boolean }) => {
      applyRow(changes);
      void supabase
        .from("profiles")
        .update(changes)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) void load(); // back to what's saved
        });
    },
    [userId, applyRow, load],
  );

  return {
    density,
    setDensity: (value: Density) => save({ ui_density: value }),
    showClipboardSetting: flags.clipboard, // the toggle shows whenever the flag is on
    clipboardSharing: clipboardOn === true,
    clipsActive: flags.clipboard && clipboardOn === true,
    setClipboardSharing: (value: boolean) => save({ clipboard_enabled: value }),
  };
}
