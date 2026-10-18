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

    // Live updates: new rows, delivered_at set by the laptop, and deletes.
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { files, loading, error, refresh };
}
