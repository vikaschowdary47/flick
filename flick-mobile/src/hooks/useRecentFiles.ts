import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FileRow } from "../lib/types";

const LIMIT = 20;

export function useRecentFiles(userId: string) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("files")
      .select("id, user_id, name, size, mime_type, storage_path, created_at, delivered_at")
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
    refresh();

    // Live updates: new rows, and delivered_at set by the laptop ("Got it!").
    const channel = supabase
      .channel(`files-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "files", filter: `user_id=eq.${userId}` },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { files, loading, error, refresh };
}
