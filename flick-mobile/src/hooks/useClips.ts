import { useCallback, useEffect, useRef, useState } from "react";
import { CLIP_MAX_CHARS, clipKind, type ClipRow } from "../lib/clips";
import { supabase } from "../lib/supabase";

// Clips list with live updates. Does nothing at all (no fetch, no
// subscription) unless `active` — the flag and the per-device setting.
export function useClips(userId: string, deviceId: string | null, active: boolean) {
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  const refresh = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("clips")
      .select("id, user_id, device_id, kind, content, created_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (queryError) {
      setError("Couldn't load clips. Pull to retry.");
      return;
    }
    setError(null);
    setClips((data ?? []) as ClipRow[]);
  }, []);

  useEffect(() => {
    if (!active) {
      setClips([]);
      setHasNew(false);
      return;
    }
    void refresh();
    const channel = supabase
      .channel(`clips-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clips", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Partial<ClipRow>;
          if (row.device_id !== deviceIdRef.current) setHasNew(true);
          void refresh();
        },
      )
      // DELETE events can't be filtered by user_id and only carry the id.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "clips" }, () => void refresh())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, active, refresh]);

  // Returns an error message, or null when sent.
  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const content = text.trim();
      if (!content) return "There's nothing to send.";
      if (content.length > CLIP_MAX_CHARS) return `Clips can be up to ${CLIP_MAX_CHARS.toLocaleString()} characters.`;
      const { error: insertError } = await supabase.from("clips").insert({
        user_id: userId,
        device_id: deviceIdRef.current,
        kind: clipKind(content),
        content,
      });
      if (insertError) return /network|fetch/i.test(insertError.message) ? "Connection dropped. Try again." : "Couldn't send that clip.";
      void refresh();
      return null;
    },
    [userId, refresh],
  );

  // Delete everywhere (every device sees the DELETE over Realtime).
  const remove = useCallback(
    async (id: string) => {
      setClips((current) => current.filter((clip) => clip.id !== id));
      const { error: deleteError } = await supabase.from("clips").delete().eq("id", id);
      if (deleteError) {
        setError("Couldn't delete that clip.");
        void refresh();
      }
    },
    [refresh],
  );

  return { clips, hasNew, clearNew: () => setHasNew(false), error, send, remove, refresh };
}
