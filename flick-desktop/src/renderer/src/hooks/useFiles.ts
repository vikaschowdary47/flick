import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { FileCard } from "../../../shared/files";
import { limitFromError, type LimitKind } from "../limits";
import { supabase } from "../supabase";
import { uploadThumbnail } from "../thumbs";
import { CloudFile, CloudFileRow, compareFiles, isCloudFile, MAX_FILE_SIZE } from "../types";

const REMOVAL_UNDO_DELAY = 5000;

export interface PendingRemoval {
  id: string;
  file: CloudFile;
}

export function useFiles(session: Session | null, deviceId: string | null = null) {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [limitHit, setLimitHit] = useState<LimitKind | null>(null);
  // Loading the list failed (separate from upload errors, so the empty state
  // never shows for a failed load). Includes the Supabase detail in dev builds.
  const [loadError, setLoadError] = useState("");
  const reloadRef = useRef<() => void>(() => {});
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [arrivalPulse, setArrivalPulse] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingRemovals, setPendingRemovals] = useState<PendingRemoval[]>([]);
  const [dismissedFileIds, setDismissedFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstArrivalRef = useRef(false);
  const dragDepth = useRef(0);
  // True while a card is being dragged out of the widget, so its own drop
  // zone doesn't treat that file as a new upload (which made duplicates).
  const outgoingDragRef = useRef(false);
  const uploadInProgress = useRef(false);
  const processFileRef = useRef<(file: CloudFileRow) => void>(() => {});
  const retryDownloadRef = useRef<(file: CloudFile) => void>(() => {});
  const removalTimersRef = useRef(new Map<string, number>());
  const filesRef = useRef(files);
  const dismissedFileIdsRef = useRef(dismissedFileIds);
  filesRef.current = files;
  dismissedFileIdsRef.current = dismissedFileIds;

  useEffect(
    () => () => {
      for (const timer of removalTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      removalTimersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (arrivalPulse === 0) {
      return;
    }
    const timeout = window.setTimeout(() => setArrivalPulse(0), 420);
    return () => window.clearTimeout(timeout);
  }, [arrivalPulse]);

  useEffect(() => {
    if (!showConfetti) {
      return;
    }
    const timeout = window.setTimeout(() => setShowConfetti(false), 420);
    return () => window.clearTimeout(timeout);
  }, [showConfetti]);

  useEffect(() => {
    const userId = session?.user.id;
    dismissedFileIdsRef.current = new Set();
    setDismissedFileIds(new Set());
    if (!supabase || !userId) {
      setFiles([]);
      setIsLoadingFiles(false);
      return;
    }
    const client = supabase;

    let isMounted = true;
    const processingFileIds = new Set<string>();
    let localFilesById = new Map<string, FileCard>();
    const localFilesPromise = window.flick.getFiles().then((localFiles) => {
      localFilesById = new Map(localFiles.map((file) => [file.id, file]));
      return localFilesById;
    });

    function updateFile(
      file: CloudFileRow,
      downloadState: CloudFile["downloadState"],
      updates: Partial<CloudFile> = {},
    ): void {
      if (!isMounted) {
        return;
      }
      setFiles((currentFiles) => {
        const nextFile = { ...file, ...updates, downloadState };
        return [
          nextFile,
          ...currentFiles.filter((currentFile) => currentFile.id !== file.id),
        ].sort(compareFiles);
      });
    }

    async function markFileDelivered(file: CloudFileRow): Promise<string> {
      const deliveredAt = new Date().toISOString();
      const { data, error } = await client
        .from("files")
        .update({ delivered_at: deliveredAt })
        .eq("id", file.id)
        .eq("user_id", userId)
        .is("delivered_at", null)
        .select("delivered_at")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (data?.delivered_at) {
        return data.delivered_at;
      }

      const { data: existingFile, error: readError } = await client
        .from("files")
        .select("delivered_at")
        .eq("id", file.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (readError) {
        throw readError;
      }
      if (!existingFile?.delivered_at) {
        throw new Error("The file was saved locally but delivery was not recorded.");
      }
      return existingFile.delivered_at;
    }

    async function processCloudFile(file: CloudFileRow): Promise<void> {
      if (processingFileIds.has(file.id)) {
        return;
      }
      processingFileIds.add(file.id);
      updateFile(
        file,
        file.delivered_at ? "delivered" : "downloading",
        { downloadError: undefined },
      );

      try {
        await localFilesPromise;
        if (!isMounted) {
          return;
        }

        const localFile = localFilesById.get(file.id);
        if (localFile) {
          updateFile(file, "ready", { localFileId: localFile.id });
          if (!file.delivered_at) {
            try {
              const deliveredAt = await markFileDelivered(file);
              updateFile(file, "ready", {
                localFileId: localFile.id,
                delivered_at: deliveredAt,
              });
            } catch (error: unknown) {
              console.error(
                `Could not mark "${file.name}" as delivered:`,
                error,
              );
              updateFile(file, "ready", {
                localFileId: localFile.id,
                downloadError:
                  "Saved locally, but delivery status could not be updated.",
              });
            }
          }
          return;
        }

        if (file.delivered_at) {
          updateFile(file, "delivered");
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error("This file is larger than the 50 MB limit.");
        }

        const { data: blob, error: downloadError } = await client.storage
          .from("flick-files")
          .download(file.storage_path);
        if (downloadError) {
          throw downloadError;
        }
        if (blob.size !== file.size || blob.size > MAX_FILE_SIZE) {
          throw new Error("The downloaded file size does not match its record.");
        }

        const localFileCard = await window.flick.saveReceivedFile(
          file.name,
          new Uint8Array(await blob.arrayBuffer()),
          file.id,
        );
        localFilesById.set(localFileCard.id, localFileCard);
        if (dismissedFileIdsRef.current.has(file.id)) {
          await window.flick.removeFile(localFileCard.id);
        }
        updateFile(file, "ready", { localFileId: localFileCard.id });

        try {
          const deliveredAt = await markFileDelivered(file);
          updateFile(file, "ready", {
            localFileId: localFileCard.id,
            delivered_at: deliveredAt,
          });
        } catch (error: unknown) {
          console.error(`Could not mark "${file.name}" as delivered:`, error);
          updateFile(file, "ready", {
            localFileId: localFileCard.id,
            downloadError:
              "Saved locally, but delivery status could not be updated.",
          });
        }
      } catch (error: unknown) {
        console.error(`Could not download "${file.name}" from Flick:`, error);
        updateFile(file, "error", {
          downloadError:
            error instanceof Error ? error.message : "File download failed.",
        });
      } finally {
        processingFileIds.delete(file.id);
      }
    }

    const queueFile = (value: unknown): void => {
      if (!isCloudFile(value)) {
        console.error("Flick received an invalid file row.");
        return;
      }
      const file = value;
      if (file.user_id !== userId) {
        console.error("Flick received an invalid file row.");
        return;
      }
      void processCloudFile(file);
    };

    processFileRef.current = queueFile;
    retryDownloadRef.current = (file) => {
      processingFileIds.delete(file.id);
      void processCloudFile(file);
    };

    let loadingRowsPromise: Promise<void> | null = null;
    let reloadRowsRequested = false;

    async function loadInitialRows(): Promise<void> {
      try {
        const [{ data, error }] = await Promise.all([
          client
            .from("files")
            .select(
              "id,user_id,name,size,mime_type,storage_path,created_at,delivered_at,pinned,pinned_at,device_id,thumb_path",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .returns<CloudFileRow[]>(),
          localFilesPromise,
        ]);
        if (error) {
          throw error;
        }
        if (isMounted) {
          setLoadError("");
          for (const row of data) {
            queueFile(row);
          }
          setFiles((currentFiles) => {
            const byId = new Map(currentFiles.map((file) => [file.id, file]));
            for (const row of data) {
              if (!byId.has(row.id)) {
                byId.set(row.id, {
                  ...row,
                  downloadState: row.delivered_at ? "delivered" : "downloading",
                });
              }
            }
            return Array.from(byId.values()).sort(compareFiles);
          });
        }
      } catch (error: unknown) {
        // The real Supabase error (message, code, details, hint) for debugging.
        console.error("Could not load this user's Flick files:", error);
        if (isMounted) {
          const detail =
            typeof error === "object" && error !== null
              ? [
                  (error as { message?: unknown }).message,
                  (error as { code?: unknown }).code && `code ${String((error as { code?: unknown }).code)}`,
                  (error as { details?: unknown }).details,
                  (error as { hint?: unknown }).hint,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : String(error);
          setLoadError(
            import.meta.env.DEV && detail
              ? `Could not load your files. (${detail})`
              : "Could not load your files.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFiles(false);
        }
      }
    }

    reloadRef.current = () => {
      setIsLoadingFiles(true);
      refreshFiles();
    };

    function refreshFiles(): void {
      if (loadingRowsPromise) {
        reloadRowsRequested = true;
        return;
      }
      loadingRowsPromise = loadInitialRows().finally(() => {
        loadingRowsPromise = null;
        if (reloadRowsRequested && isMounted) {
          reloadRowsRequested = false;
          refreshFiles();
        }
      });
    }

    const channel = client
      .channel(`files:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "files",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.info("New Flick file row:", payload.new);
          if (isCloudFile(payload.new)) {
            setArrivalPulse((pulse) => pulse + 1);
            window.flick.notifyArrival();
            if (!firstArrivalRef.current) {
              firstArrivalRef.current = true;
              setShowConfetti(true);
            }
          }
          queueFile(payload.new);
        },
      )
      // Pins set on the phone: update the card in place and re-sort.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "files",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Partial<CloudFileRow>;
          if (typeof row.id !== "string") {
            return;
          }
          setFiles((current) =>
            current
              .map((file) =>
                file.id === row.id
                  ? {
                      ...file,
                      pinned: Boolean(row.pinned),
                      pinned_at: row.pinned_at ?? null,
                    }
                  : file,
              )
              .sort(compareFiles),
          );
        },
      )
      // Supabase can't filter DELETE events by column and only sends the
      // primary key, so match on id; ids that aren't ours are ignored.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "files" },
        (payload) => {
          const deletedId = (payload.old as { id?: unknown }).id;
          if (typeof deletedId === "string") {
            void dropDeletedFile(deletedId);
          }
        },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          refreshFiles();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Flick Realtime subscription failed:", error ?? status);
          refreshFiles();
        }
      });

    setFiles([]);
    setUploadError("");
    setLoadError("");
    setIsLoadingFiles(true);

    return () => {
      isMounted = false;
      processFileRef.current = () => {};
      retryDownloadRef.current = () => {};
      void client
        .removeChannel(channel)
        .then((status) => {
          if (status !== "ok") {
            console.error("Could not remove Flick Realtime channel:", status);
          }
        })
        .catch((error: unknown) => {
          console.error("Could not remove Flick Realtime channel:", error);
        });
    };
  }, [session?.user.id]);

  async function uploadFiles(selectedFiles: File[]): Promise<void> {
    if (!supabase || !session) {
      setUploadError("Sign in before adding files.");
      return;
    }
    if (uploadInProgress.current || selectedFiles.length === 0) {
      return;
    }

    uploadInProgress.current = true;
    setIsUploading(true);
    setUploadError("");
    const failures: string[] = [];

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          failures.push(`${file.name} is larger than the 50 MB limit.`);
          continue;
        }

        const safeName = file.name.replace(/[\\/]/g, "_").trim() || "file";
        const storagePath = `${session.user.id}/${crypto.randomUUID()}/${safeName}`;
        let uploadExists = false;
        let thumbPath: string | null = null;
        try {
          const { error: storageError } = await supabase.storage
            .from("flick-files")
            .upload(storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (storageError) {
            throw storageError;
          }
          uploadExists = true;

          // Images: a small thumbnail for the grid (skipped if it fails).
          if (file.type.startsWith("image/")) {
            thumbPath = await uploadThumbnail(session.user.id, file);
          }

          const { data, error: rowError } = await supabase
            .from("files")
            .insert({
              user_id: session.user.id,
              name: safeName,
              size: file.size,
              mime_type: file.type || "application/octet-stream",
              storage_path: storagePath,
              device_id: deviceId, // the sender, for "from <device>"
              thumb_path: thumbPath,
            })
            .select(
              "id,user_id,name,size,mime_type,storage_path,created_at,delivered_at,pinned,pinned_at,device_id,thumb_path",
            )
            .single()
            .returns<CloudFileRow>();

          if (rowError) {
            throw rowError;
          }

          uploadExists = false;
          setFiles((currentFiles) => {
            const existing = currentFiles.find((file) => file.id === data.id);
            if (existing) {
              return currentFiles;
            }
            return [
              {
                ...data,
                downloadState: "downloading",
              },
              ...currentFiles,
            ];
          });
          processFileRef.current(data);
        } catch (error: unknown) {
          console.error(`Could not upload "${file.name}":`, error);
          if (uploadExists) {
            try {
              const { error: cleanupError } = await supabase.storage
                .from("flick-files")
                .remove(thumbPath ? [storagePath, thumbPath] : [storagePath]);
              if (cleanupError) {
                console.error(
                  `Could not remove incomplete upload "${storagePath}":`,
                  cleanupError,
                );
              }
            } catch (cleanupError: unknown) {
              console.error(
                `Could not remove incomplete upload "${storagePath}":`,
                cleanupError,
              );
            }
          }
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "object" && error !== null && "message" in error
                ? String(error.message)
                : "Upload failed.";
          // Plan limit hit (enforced by the database): show the limit screen.
          if (limitFromError(error) === "storage") {
            setLimitHit("storage");
            break;
          }
          failures.push(`${file.name}: ${message}`);
        }
      }
    } finally {
      uploadInProgress.current = false;
      setIsUploading(false);
    }

    if (failures.length > 0) {
      setUploadError(failures.join(" "));
    }
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(selectedFiles);
  }

  function startFileDrag(file: CloudFile): void {
    if (!file.localFileId) {
      return;
    }
    outgoingDragRef.current = true;
    // A native drag swallows mouse events until it ends; the first plain
    // mouse move afterwards means the drag is over.
    const clear = (event: MouseEvent) => {
      if (event.buttons === 0) {
        outgoingDragRef.current = false;
        window.flick.endFileDrag();
        window.removeEventListener("mousemove", clear);
      }
    };
    window.addEventListener("mousemove", clear);
    window.flick.startFileDrag(file.localFileId);
  }

  function handleDragEnter(event: DragEvent<HTMLElement>): void {
    if (outgoingDragRef.current || !event.dataTransfer.types.includes("Files")) {
      return;
    }
    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    if (outgoingDragRef.current) {
      // Show "not allowed" instead of "copy" over our own window.
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      return;
    }
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(event: DragEvent<HTMLElement>): void {
    if (outgoingDragRef.current || !event.dataTransfer.types.includes("Files")) {
      return;
    }
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDraggingFiles(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);
    if (outgoingDragRef.current) {
      outgoingDragRef.current = false;
      return;
    }
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  // Removes the card and this Mac's copy after the row was deleted
  // (here or on another device).
  async function dropDeletedFile(fileId: string): Promise<void> {
    const currentFile = filesRef.current.find((item) => item.id === fileId);
    setFiles((current) => current.filter((item) => item.id !== fileId));
    try {
      const localFileId =
        currentFile?.localFileId ??
        (await window.flick.getFiles()).find((item) => item.id === fileId)?.id;
      if (localFileId) {
        await window.flick.removeFile(localFileId);
      }
    } catch (error: unknown) {
      console.error(`Could not remove local copy of "${fileId}":`, error);
    }
  }

  async function deleteFromSupabase(file: CloudFile): Promise<void> {
    // Row first: an orphaned storage object is invisible, but a row without
    // its object would show up everywhere as a broken file.
    if (!supabase) {
      throw new Error("Flick isn't connected to Supabase.");
    }
    const { data, error } = await supabase
      .from("files")
      .delete()
      .eq("id", file.id)
      .select("id");
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error("It may already be gone, or you're signed out.");
    }
    const { error: storageError } = await supabase.storage
      .from("flick-files")
      .remove(file.thumb_path ? [file.storage_path, file.thumb_path] : [file.storage_path]);
    if (storageError) {
      console.error(
        `Deleted "${file.name}" but could not remove "${file.storage_path}" from storage:`,
        storageError,
      );
    }
  }

  function removeFromWidget(file: CloudFile): void {
    if (removalTimersRef.current.has(file.id)) {
      return;
    }

    setPendingRemovals((current) => [...current, { id: file.id, file }]);
    const timer = window.setTimeout(() => {
      removalTimersRef.current.delete(file.id);
      void (async () => {
        try {
          await deleteFromSupabase(file);
          const currentFile =
            filesRef.current.find((item) => item.id === file.id) ?? file;
          const localFileId =
            currentFile.localFileId ??
            (await window.flick.getFiles()).find(
              (item) => item.id === file.id,
            )?.id;
          if (localFileId) {
            await window.flick.removeFile(localFileId);
          }
          dismissedFileIdsRef.current = new Set(
            dismissedFileIdsRef.current,
          ).add(file.id);
          setDismissedFileIds((current) => new Set(current).add(file.id));
          setFiles((current) => current.filter((item) => item.id !== file.id));
          setPendingRemovals((current) =>
            current.filter((item) => item.id !== file.id),
          );
        } catch (error: unknown) {
          console.error(`Could not remove "${file.name}" from Flick:`, error);
          setPendingRemovals((current) =>
            current.filter((item) => item.id !== file.id),
          );
          setUploadError(
            error instanceof Error
              ? `Could not remove "${file.name}" from Flick: ${error.message}`
              : `Could not remove "${file.name}" from Flick.`,
          );
        }
      })();
    }, REMOVAL_UNDO_DELAY);
    removalTimersRef.current.set(file.id, timer);
  }

  function undoRemove(fileId: string): void {
    const timer = removalTimersRef.current.get(fileId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      removalTimersRef.current.delete(fileId);
    }
    const removal = pendingRemovals.find((item) => item.id === fileId);
    setPendingRemovals((current) =>
      current.filter((item) => item.id !== fileId),
    );
    if (removal) {
      setFiles((current) => {
        if (current.some((file) => file.id === removal.file.id)) {
          return current;
        }
        return [...current, removal.file].sort(compareFiles);
      });
    }
  }

  // Pin or unpin. The database trigger sets pinned_at and enforces the free
  // limit of 3 pins; the card moves right away and rolls back on failure.
  async function togglePin(file: CloudFile): Promise<void> {
    if (!supabase) {
      return;
    }
    const pinned = !file.pinned;
    const apply = (value: boolean, pinnedAt: string | null) =>
      setFiles((current) =>
        current
          .map((item) =>
            item.id === file.id ? { ...item, pinned: value, pinned_at: pinnedAt } : item,
          )
          .sort(compareFiles),
      );
    setUploadError("");
    apply(pinned, pinned ? new Date().toISOString() : null);
    const { data, error } = await supabase
      .from("files")
      .update({ pinned })
      .eq("id", file.id)
      .select("pinned,pinned_at")
      .maybeSingle();
    if (error || !data) {
      apply(Boolean(file.pinned), file.pinned_at ?? null);
      if (limitFromError(error) === "pins") {
        setLimitHit("pins");
      } else {
        setUploadError(`Could not ${pinned ? "pin" : "unpin"} "${file.name}".`);
      }
      return;
    }
    apply(Boolean(data.pinned), data.pinned_at ?? null);
  }

  async function previewFile(file: CloudFile): Promise<void> {
    if (!file.localFileId) {
      return;
    }
    try {
      await window.flick.previewFile(file.localFileId);
    } catch (error: unknown) {
      console.error(`Could not preview "${file.name}":`, error);
      setUploadError(
        error instanceof Error
          ? `Could not preview "${file.name}": ${error.message}`
          : `Could not preview "${file.name}".`,
      );
    }
  }

  return {
    arrivalPulse,
    fileInputRef,
    // Files waiting out their 5-second undo stay in the list (see
    // pendingRemovals): compact layouts show them as an inline "Removed ·
    // Undo" strip in place, Comfy cards hide them and show the toast.
    files: files.filter((file) => !dismissedFileIds.has(file.id)),
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelection,
    isDraggingFiles,
    isLoadingFiles,
    isUploading,
    pendingRemovals,
    previewFile,
    removeFromWidget,
    retryDownload: (file: CloudFile) => retryDownloadRef.current(file),
    showConfetti,
    startFileDrag,
    togglePin,
    undoRemove,
    uploadError,
    loadError,
    retryLoad: () => reloadRef.current(),
    limitHit,
    clearLimit: () => setLimitHit(null),
  };
}
