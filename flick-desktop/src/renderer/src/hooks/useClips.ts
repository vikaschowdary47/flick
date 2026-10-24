import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CLIP_MAX_CHARS, clipKind, type ClipRow } from "../clips";
import { supabase } from "../supabase";

// Clips list with live updates. Does nothing at all (no fetch, no
// subscription) unless `active` — the flag and the per-device setting.
export function useClips(session: Session | null, deviceId: string | null, active: boolean) {
  const userId = session?.user.id;
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const [error, setError] = useState("");
  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  const refresh = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data, error: queryError } = await supabase
      .from("clips")
      .select("id,user_id,device_id,kind,content,created_at,expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (queryError) {
      setError("Couldn't load clips.");
      return;
    }
    setError("");
    setClips((data ?? []) as ClipRow[]);
  }, []);

  useEffect(() => {
    if (!active || !supabase || !userId) {
      setClips([]);
      setHasNew(false);
      return;
    }
    const client = supabase;
    void refresh();
    const channel = client
      .channel(`clips:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clips", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Partial<ClipRow>;
          if (row.device_id !== deviceIdRef.current) {
            setHasNew(true);
            if (deviceIdRef.current && row.device_id && typeof row.id === "string") {
              window.flick.notifyArrival({ kind: "clip", id: row.id });
            }
          }
          void refresh();
        },
      )
      // DELETE events can't be filtered by user_id and only carry the id.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "clips" }, () => {
        void refresh();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refresh();
        }
      });
    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, active, refresh]);

  // Returns an error message, or null when sent.
  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const content = text.trim();
      if (!supabase || !userId) {
        return "Sign in to send clips.";
      }
      if (!content) {
        return "There's nothing to send.";
      }
      if (content.length > CLIP_MAX_CHARS) {
        return `Clips can be up to ${CLIP_MAX_CHARS.toLocaleString()} characters.`;
      }
      const { error: insertError } = await supabase.from("clips").insert({
        user_id: userId,
        device_id: deviceIdRef.current,
        kind: clipKind(content),
        content,
      });
      if (insertError) {
        return "Couldn't send that clip.";
      }
      void refresh();
      return null;
    },
    [userId, refresh],
  );

  // Delete everywhere (every device sees the DELETE over Realtime).
  async function remove(id: string): Promise<void> {
    if (!supabase) {
      return;
    }
    setClips((current) => current.filter((clip) => clip.id !== id));
    const { error: deleteError } = await supabase.from("clips").delete().eq("id", id);
    if (deleteError) {
      setError("Couldn't delete that clip.");
      void refresh();
    }
  }

  return { clips, hasNew, clearNew: () => setHasNew(false), error, send, remove };
}
