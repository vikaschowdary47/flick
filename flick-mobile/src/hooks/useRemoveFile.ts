import { useCallback, useEffect, useRef, useState } from "react";
import { FILES_BUCKET, supabase } from "../lib/supabase";
import type { FileRow } from "../lib/types";

// Same as the desktop "Remove from Flick": after a short undo window the row
// and the stored file are deleted, so the file disappears on every device.
const UNDO_MS = 5000;

export function useRemoveFile(onRemoved: () => void) {
  const [pending, setPending] = useState<FileRow | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<FileRow | null>(null);

  const finalize = useCallback(
    async (file: FileRow) => {
      setDeletingIds((current) => new Set(current).add(file.id));
      try {
        // Row first: an orphaned storage object is invisible, but a row
        // without its object would show up everywhere as a broken file.
        const { data, error: rowError } = await supabase
          .from("files")
          .delete()
          .eq("id", file.id)
          .select("id");
        if (rowError) throw rowError;
        if (!data || data.length === 0) throw new Error("not deleted");

        const { error: storageError } = await supabase.storage
          .from(FILES_BUCKET)
          .remove(file.thumb_path ? [file.storage_path, file.thumb_path] : [file.storage_path]);
        if (storageError) {
          console.warn(`Deleted "${file.name}" but storage cleanup failed`, storageError);
        }
        onRemoved();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(
          /network|fetch/i.test(message)
            ? `Couldn't remove "${file.name}". Check your connection.`
            : `Couldn't remove "${file.name}". Try again.`,
        );
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current);
          next.delete(file.id);
          return next;
        });
      }
    },
    [onRemoved],
  );

  const remove = useCallback(
    (file: FileRow) => {
      setError(null);
      if (timer.current) clearTimeout(timer.current);
      // A second removal finalises the first one straight away.
      const previous = pendingRef.current;
      if (previous && previous.id !== file.id) void finalize(previous);

      pendingRef.current = file;
      setPending(file);
      timer.current = setTimeout(() => {
        timer.current = null;
        pendingRef.current = null;
        setPending(null);
        void finalize(file);
      }, UNDO_MS);
    },
    [finalize],
  );

  const undo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingRef.current = null;
    setPending(null);
  }, []);

  // Leaving the screen (e.g. sign-out) mid-countdown still deletes.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendingRef.current) void finalize(pendingRef.current);
    },
    [finalize],
  );

  const isHidden = useCallback(
    (id: string) => pending?.id === id || deletingIds.has(id),
    [pending, deletingIds],
  );

  // "Free up space": the user confirmed a list, so remove each now, one
  // after another, through the same delete path (row, then storage).
  const removeNow = useCallback(
    async (files: FileRow[]) => {
      for (const file of files) await finalize(file);
    },
    [finalize],
  );

  return { remove, removeNow, undo, pending, isHidden, error };
}
