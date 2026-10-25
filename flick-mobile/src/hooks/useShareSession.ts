import { useEffect } from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { widgetsBridge } from "../../modules/flick-widgets";
import { cacheEpoch, cacheEpochActive } from "../lib/cache";
import { supabase } from "../lib/supabase";

// Shares the signed-in session with the "eqlShare it" share extension through
// the App Group, so sharing from other apps uploads as you. The extension
// may refresh the tokens (writing by: "extension"); when Flick next comes to
// the foreground it adopts that newer session, so neither side gets signed
// out by a used-up refresh token.
type SharedSession = {
  version: 1;
  by: "app" | "extension";
  updatedAt: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // seconds since epoch
  userId: string;
  supabaseUrl: string;
  publishableKey: string;
  deviceId: string | null;
};

function write(session: Session, deviceId: string | null) {
  if (!cacheEpochActive(cacheEpoch())) return;
  const shared: SharedSession = {
    version: 1,
    by: "app",
    updatedAt: Date.now(),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    userId: session.user.id,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    deviceId,
  };
  void widgetsBridge.writeSession(JSON.stringify(shared)).catch(() => {});
}

export function useShareSession(deviceId: string | null) {
  useEffect(() => {
    if (!widgetsBridge.available()) return;

    // Adopt a session the extension refreshed while Flick was closed.
    const adopt = async () => {
      const raw = await widgetsBridge.readSession().catch(() => null);
      const { data } = await supabase.auth.getSession();
      if (!cacheEpochActive(cacheEpoch())) return;
      if (raw) {
        try {
          const shared = JSON.parse(raw) as SharedSession;
          if (shared.by === "extension" && data.session && shared.refreshToken !== data.session.refresh_token) {
            const { data: adopted } = await supabase.auth.setSession({
              access_token: shared.accessToken,
              refresh_token: shared.refreshToken,
            });
            if (adopted.session) {
              write(adopted.session, deviceId);
              return;
            }
          }
        } catch {
          // fall through: write ours
        }
      }
      if (data.session) write(data.session, deviceId);
    };
    void adopt();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
        write(session, deviceId);
      }
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void adopt();
    });
    return () => {
      listener.subscription.unsubscribe();
      appState.remove();
    };
  }, [deviceId]);
}
