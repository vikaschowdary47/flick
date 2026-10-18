import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FileRow } from "../lib/types";

// Like the desktop "Remove from Flick": hides a file on this phone only.
// The row and the stored file stay, so other devices are unaffected.
const UNDO_MS = 5000;

export function useDismissedFiles(userId: string) {
  const key = `flick:dismissed:${userId}`;
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<FileRow | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, [key]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const commit = useCallback(
    (id: string) => {
      setDismissed((current) => {
        const next = new Set(current).add(id);
        AsyncStorage.setItem(key, JSON.stringify([...next])).catch(() => {});
        return next;
      });
    },
    [key],
  );

  const dismiss = useCallback(
    (file: FileRow) => {
      if (timer.current) clearTimeout(timer.current);
      // A second removal finalises the first one straight away.
      setPending((previous) => {
        if (previous && previous.id !== file.id) commit(previous.id);
        return file;
      });
      timer.current = setTimeout(() => {
        commit(file.id);
        setPending(null);
        timer.current = null;
      }, UNDO_MS);
    },
    [commit],
  );

  const undo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPending(null);
  }, []);

  const isHidden = useCallback(
    (id: string) => dismissed.has(id) || pending?.id === id,
    [dismissed, pending],
  );

  return { dismiss, undo, pending, isHidden };
}
