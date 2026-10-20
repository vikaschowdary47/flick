import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useFeatureFlags } from "./useFeatureFlags";

// Settings → Clipboard sharing, stored on the user's profile
// (profiles.clipboard_enabled, default on) so it syncs to every device.
// Only read when the "clipboard" feature flag is on.
export function useClipboardSetting(userId: string) {
  const flags = useFeatureFlags();
  // null until loaded: clips stay hidden rather than flashing on.
  const [on, setOn] = useState<boolean | null>(null);

  // The setting used to be saved per device; that copy is no longer used.
  useEffect(() => {
    AsyncStorage.removeItem("flick.clipboardSharing.v1").catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("clipboard_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return;
    setOn(data ? data.clipboard_enabled === true : true);
  }, [userId]);

  useEffect(() => {
    if (!flags.clipboard) {
      setOn(null);
      return;
    }
    void load();
    // Changes made on another device.
    const channel = supabase
      .channel(`profile-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        (payload) => setOn((payload.new as { clipboard_enabled?: boolean }).clipboard_enabled === true),
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
  }, [flags.clipboard, userId, load]);

  const setSharing = useCallback(
    (value: boolean) => {
      setOn(value);
      void supabase
        .from("profiles")
        .update({ clipboard_enabled: value })
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) void load(); // put the switch back to what's saved
        });
    },
    [userId, load],
  );

  return {
    showSetting: flags.clipboard, // the toggle shows whenever the flag is on
    sharingOn: on === true,
    clipsActive: flags.clipboard && on === true,
    setSharing,
  };
}
