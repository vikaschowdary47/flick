import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Density } from "../density";
import { supabase } from "../supabase";

// Comfy / Compact, stored per user in profiles.ui_density (default compact)
// so it syncs across devices. A copy in localStorage lets the window open in
// the right density before the profile loads (and after a restart offline).
const CACHE_KEY = "flick.uiDensity.v1";

function cached(): Density {
  return window.localStorage.getItem(CACHE_KEY) === "comfy" ? "comfy" : "compact";
}

export function useDensity(session: Session | null) {
  const userId = session?.user.id;
  const [density, setDensityState] = useState<Density>(cached);

  const apply = useCallback((value: unknown) => {
    const next: Density = value === "comfy" ? "comfy" : "compact";
    setDensityState(next);
    window.localStorage.setItem(CACHE_KEY, next);
  }, []);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("ui_density")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) {
      apply(data.ui_density);
    }
  }, [userId, apply]);

  useEffect(() => {
    if (!supabase || !userId) {
      return;
    }
    const client = supabase;
    void load();
    // A change made on another device.
    const channel = client
      .channel(`profile-density:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        (payload) => apply((payload.new as { ui_density?: unknown }).ui_density),
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
  }, [userId, load, apply]);

  function setDensity(next: Density): void {
    if (!supabase || !userId) {
      return;
    }
    apply(next);
    void supabase
      .from("profiles")
      .update({ ui_density: next })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          void load(); // back to what's saved
        }
      });
  }

  return { density, setDensity };
}
