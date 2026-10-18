import { useEffect, useRef, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import type { Status } from "../components/StatusPill";
import type { RealtimeStatus } from "./useRecentFiles";

// null means "not known yet" (iOS checks reachability in the background), so
// only an explicit false counts as offline.
function isOfflineState(state: NetInfoState): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

type Options = {
  realtimeStatus: RealtimeStatus;
  onReconnect: () => void;
};

// NetInfo is the main signal: it changes the moment airplane mode flips.
// The Realtime channel status is a second signal for when the network looks
// fine but Supabase can't be reached.
export function useConnectionStatus({ realtimeStatus, onReconnect }: Options) {
  const [networkOffline, setNetworkOffline] = useState(false);
  const wasOffline = useRef(false);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    let mounted = true;

    const apply = (state: NetInfoState) => {
      if (!mounted) return;
      const offline = isOfflineState(state);
      if (wasOffline.current && !offline) onReconnectRef.current();
      wasOffline.current = offline;
      setNetworkOffline(offline);
    };

    // Current state once on startup, then every change.
    NetInfo.fetch().then(apply).catch(() => {});
    const unsubscribe = NetInfo.addEventListener(apply);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Network says fine but the channel failed: try again shortly.
  useEffect(() => {
    if (networkOffline || realtimeStatus !== "error") return;
    const timer = setTimeout(() => onReconnectRef.current(), 5000);
    return () => clearTimeout(timer);
  }, [networkOffline, realtimeStatus]);

  const status: Status = networkOffline || realtimeStatus === "error" ? "offline" : "connected";
  return { status, networkOffline };
}
