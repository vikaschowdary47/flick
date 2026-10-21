import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FileRow } from "../lib/types";

// Enough for a full day of files; the list is virtualized (CompactFilesList).
const LIMIT = 200;

export type RealtimeStatus = "connecting" | "subscribed" | "error" | "closed";

export function useRecentFiles(userId: string) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const realtimeStatusRef = useRef<RealtimeStatus>("connecting");
  // Bumping this tears the channel down and subscribes again.
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("files")
      .select("id, user_id, name, size, mime_type, storage_path, created_at, delivered_at, pinned, pinned_at, device_id")
      // Pinned files first, then newest.
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    setLoading(false);
    if (queryError) {
      setError("Couldn't load recent files. Pull to retry.");
      return;
    }
    setError(null);
    setFiles((data ?? []) as FileRow[]);
  }, []);

  useEffect(() => {
    let active = true; // ignore late callbacks from a channel we've removed
    refresh();

    // Live updates: new rows, delivered_at set by the laptop, pins, and deletes.
    const channel = supabase
      .channel(`files-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "files", filter: `user_id=eq.${userId}` },
        () => {
          refresh();
        },
      )
      // DELETE events can't be filtered by user_id and only carry the id;
      // a refetch is cheap and RLS keeps it to our own rows.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "files" }, () => {
        refresh();
      })
      .subscribe((status) => {
        if (!active) return;
        const next: RealtimeStatus =
          status === "SUBSCRIBED"
            ? "subscribed"
            : status === "CLOSED"
              ? "closed"
              : "error"; // CHANNEL_ERROR or TIMED_OUT
        realtimeStatusRef.current = next;
        setRealtimeStatus(next);
        // Catch anything that changed while we weren't listening.
        if (next === "subscribed") refresh();
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, generation]);

  // Called when the network comes back.
  const reconnect = useCallback(() => {
    if (realtimeStatusRef.current !== "subscribed") {
      realtimeStatusRef.current = "connecting";
      setRealtimeStatus("connecting");
      setGeneration((g) => g + 1); // the new subscription refetches on SUBSCRIBED
    }
    refresh();
  }, [refresh]);

  return { files, loading, error, refresh, realtimeStatus, reconnect };
}
