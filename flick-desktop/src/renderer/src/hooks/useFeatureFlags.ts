import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

// Developer switches from the feature_flags table (edited in the Supabase
// dashboard). Read at sign-in, kept fresh over Realtime and when the window
// regains focus. Anything that can't be loaded counts as off.
export interface FeatureFlags {
  clipboard: boolean; // Clips (text and links)
  payments: boolean; // upgrade UI instead of the Pro waitlist
}

const ALL_OFF: FeatureFlags = { clipboard: false, payments: false };

export function useFeatureFlags(session: Session | null): FeatureFlags {
  const userId = session?.user.id;
  const [flags, setFlags] = useState<FeatureFlags>(ALL_OFF);

  const load = useCallback(async () => {
    if (!supabase) {
      setFlags(ALL_OFF);
      return;
    }
    const { data, error } = await supabase.from("feature_flags").select("name,enabled");
    if (error || !data) {
      setFlags(ALL_OFF);
      return;
    }
    const on = (name: string) => data.some((row) => row.name === name && row.enabled === true);
    setFlags({ clipboard: on("clipboard"), payments: on("payments") });
  }, []);

  useEffect(() => {
    if (!supabase || !userId) {
      setFlags(ALL_OFF);
      return;
    }
    const client = supabase;
    void load();
    const channel = client
      .channel(`feature-flags:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => {
        void load();
      })
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
  }, [userId, load]);

  return flags;
}
