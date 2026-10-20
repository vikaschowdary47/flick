import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

// Clipboard sharing, stored on the user's profile (profiles.clipboard_enabled,
// default on) so it syncs to every device. Only read when the "clipboard"
// feature flag is on.
export function useClipboardSetting(session: Session | null, flagOn: boolean) {
  const userId = session?.user.id;
  // null until loaded: clips stay hidden rather than flashing on.
  const [on, setOn] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("clipboard_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return;
    }
    setOn(data ? data.clipboard_enabled === true : true);
  }, [userId]);

  useEffect(() => {
    if (!flagOn || !supabase || !userId) {
      setOn(null);
      return;
    }
    const client = supabase;
    void load();
    // Changes made on another device.
    const channel = client
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        (payload) => setOn((payload.new as { clipboard_enabled?: boolean }).clipboard_enabled === true),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void load();
        }
      });
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      void client.removeChannel(channel);
    };
  }, [flagOn, userId, load]);

  function setSharing(value: boolean): void {
    if (!supabase || !userId) {
      return;
    }
    setOn(value);
    void supabase
      .from("profiles")
      .update({ clipboard_enabled: value })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          void load(); // put the toggle back to what's saved
        }
      });
  }

  const clipsActive = flagOn && on === true;

  // The main process owns the shortcut and tray item: keep it in step.
  useEffect(() => {
    void window.flick.setClipsActive(clipsActive);
  }, [clipsActive]);

  return { sharingOn: on === true, clipsActive, setSharing };
}
