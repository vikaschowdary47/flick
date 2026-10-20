import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { limitFromError, type LimitKind } from "../lib/limits";
import type { FileRow } from "../lib/types";

// Pin or unpin a file. The database trigger enforces the free pin limit and
// sets pinned_at; a refetch (or Realtime) re-sorts the list.
export function usePinFile(onChanged: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState<LimitKind | null>(null);

  const togglePin = useCallback(
    async (file: FileRow) => {
      setError(null);
      const { error: updateError } = await supabase
        .from("files")
        .update({ pinned: !file.pinned })
        .eq("id", file.id);
      if (updateError) {
        const limit = limitFromError(updateError);
        if (limit) setLimitHit(limit);
        else
          setError(
            /network|fetch/i.test(updateError.message)
              ? `Couldn't ${file.pinned ? "unpin" : "pin"} "${file.name}". Check your connection.`
              : `Couldn't ${file.pinned ? "unpin" : "pin"} "${file.name}". Try again.`,
          );
        return;
      }
      onChanged();
    },
    [onChanged],
  );

  const clearLimit = useCallback(() => setLimitHit(null), []);

  return { togglePin, error, limitHit, clearLimit };
}
