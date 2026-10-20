import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

// Developer switches from the feature_flags table (edited in the Supabase
// dashboard). Read at sign-in, kept fresh over Realtime and when the app
// comes back to the foreground. Anything that can't be loaded counts as off.
export type FeatureFlags = {
  clipboard: boolean; // Clips (text and links)
  payments: boolean; // upgrade UI instead of the Pro waitlist
};

const ALL_OFF: FeatureFlags = { clipboard: false, payments: false };

const FeatureFlagsContext = createContext<FeatureFlags>(ALL_OFF);

export function FeatureFlagsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(ALL_OFF);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("feature_flags").select("name, enabled");
    if (error || !data) {
      setFlags(ALL_OFF);
      return;
    }
    const on = (name: string) => data.some((row) => row.name === name && row.enabled === true);
    setFlags({ clipboard: on("clipboard"), payments: on("payments") });
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`feature-flags-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => void load())
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
  }, [userId, load]);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext);
}
