import { AnimatePresence, motion } from "framer-motion";
import type { ChangeEvent, RefObject } from "react";
import FileCard from "./FileCard";
import { CloudFile } from "../types";
import type { PendingRemoval } from "../hooks/useFiles";

interface FileListProps {
  files: CloudFile[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isLoadingFiles: boolean;
  isUploading: boolean;
  uploadError: string;
  pendingRemovals: PendingRemoval[];
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onPreview: (file: CloudFile) => void;
  onRemove: (file: CloudFile) => void;
  onRetryDownload: (file: CloudFile) => void;
  onUndoRemove: (fileId: string) => void;
}

export default function FileList({
  files,
  fileInputRef,
  isLoadingFiles,
  isUploading,
  uploadError,
  pendingRemovals,
  onFileSelection,
  onPreview,
  onRemove,
  onRetryDownload,
  onUndoRemove,
}: FileListProps) {
  function handleChooseFiles(): void {
    fileInputRef.current?.click();
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">ON THIS MAC</p>
          <h1 id="incoming-heading">
            {files.length > 0
              ? `${files.length} ${files.length === 1 ? "file" : "files"} landed`
              : isLoadingFiles
                ? "A moment…"
                : "Nothing yet"}
          </h1>
        </div>
        <div className="file-actions">
          <button
            className="add-file-button"
            type="button"
            aria-label="Choose files to upload"
            title="Choose files to upload"
            disabled={isUploading}
            onClick={handleChooseFiles}
          >
            +
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        multiple
        onChange={onFileSelection}
        aria-label="Choose files to upload"
      />
      {files.length > 0 && (
        <motion.div layout className="files-list">
          <AnimatePresence initial={false}>
            {files.map((file, index) => (
              <FileCard
                file={file}
                index={index}
                key={file.id}
                onPreview={onPreview}
                onRemove={onRemove}
                onRetry={onRetryDownload}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      {files.length === 0 && !isLoadingFiles && (
        <div className="empty-files">
          <div className="empty-illustration" aria-hidden="true">
            <span className="empty-sparkle empty-sparkle-one">✦</span>
            <span className="empty-sparkle empty-sparkle-two">✦</span>
            <svg viewBox="0 0 72 72">
              <path d="M18 25a5 5 0 0 1 5-5h14l6 7h6a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5z" />
              <path d="M27 39h18M36 30v18m-7-7 7 7 7-7" />
            </svg>
          </div>
          <h2>Nothing yet.</h2>
          <p>Flick something over!</p>
          <button
            className="choose-files-button"
            type="button"
            disabled={isUploading}
            onClick={handleChooseFiles}
          >
            {isUploading ? "Uploading…" : "Choose a file"}
          </button>
          <span className="empty-drop-hint">or drag and drop a file here</span>
        </div>
      )}
      {files.length === 0 && isLoadingFiles && (
        <p className="auth-status" role="status">
          Loading your files…
        </p>
      )}
      {files.length > 0 && isUploading && (
        <p className="auth-status" role="status">
          Uploading…
        </p>
      )}
      {uploadError && (
        <p className="auth-error" role="alert">
          {uploadError}
        </p>
      )}
      {pendingRemovals.length > 0 && (
        <div className="removal-toasts" aria-live="polite">
          {pendingRemovals.map(({ id, file }) => (
            <div className="removal-toast" role="status" key={id}>
              <span>Removed.</span>
              <button
                type="button"
                aria-label={`Undo removal of ${file.name}`}
                onClick={() => onUndoRemove(id)}
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
