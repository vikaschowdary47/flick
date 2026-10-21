import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { groupSections, loadCollapsed, saveCollapsed, type SectionKey } from "../sections";
import type { ChangeEvent, RefObject } from "react";
import CompactFileRow from "./CompactFileRow";
import CompactImageTile from "./CompactImageTile";
import FileCard from "./FileCard";
import type { Density } from "../density";
import { CloudFile, formatSender, getFileVisualType } from "../types";
import type { PendingRemoval } from "../hooks/useFiles";
import { useNow } from "../hooks/useNow";

interface FileListProps {
  files: CloudFile[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  isLoadingFiles: boolean;
  isUploading: boolean;
  uploadError: string;
  pendingRemovals: PendingRemoval[];
  deviceId: string | null;
  deviceNames: Record<string, string>;
  density: Density;
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onPreview: (file: CloudFile) => void;
  onStartDrag: (file: CloudFile) => void;
  onRemove: (file: CloudFile) => void;
  onTogglePin: (file: CloudFile) => void;
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
  deviceId,
  deviceNames,
  density,
  onFileSelection,
  onPreview,
  onStartDrag,
  onRemove,
  onTogglePin,
  onRetryDownload,
  onUndoRemove,
}: FileListProps) {
  const now = useNow();

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
      {files.length > 0 && density === "compact" && (
        <CompactFiles
          files={files}
          now={now}
          senderOf={(file) => formatSender(file.device_id, deviceId, deviceNames)}
          onPreview={onPreview}
          onStartDrag={onStartDrag}
          onRemove={onRemove}
          onTogglePin={onTogglePin}
          onRetry={onRetryDownload}
        />
      )}
      {files.length > 0 && density === "comfy" && (
        <motion.div layout className="files-list">
          <AnimatePresence initial={false}>
            {files.map((file, index) => (
              <FileCard
                file={file}
                index={index}
                now={now}
                sender={formatSender(file.device_id, deviceId, deviceNames)}
                key={file.id}
                onPreview={onPreview}
                onStartDrag={onStartDrag}
                onRemove={onRemove}
                onTogglePin={onTogglePin}
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

interface CompactFilesProps {
  files: CloudFile[];
  now: number;
  senderOf: (file: CloudFile) => string;
  onPreview: (file: CloudFile) => void;
  onStartDrag: (file: CloudFile) => void;
  onRemove: (file: CloudFile) => void;
  onTogglePin: (file: CloudFile) => void;
  onRetry: (file: CloudFile) => void;
}

const SECTION_PREVIEW = 5; // items shown before "+N more"

// Compact layout: Pinned / Today / Earlier sections. Each can collapse and
// shows its first few items plus "+N more". Inside a section, images form a
// grid of tiles and everything else is a row.
function CompactFiles({ files, now, senderOf, ...actions }: CompactFilesProps) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [expanded, setExpanded] = useState<Set<SectionKey>>(new Set());
  const sections = groupSections(files, now);

  function toggleCollapsed(key: SectionKey): void {
    const next = new Set(collapsed);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setCollapsed(next);
    saveCollapsed(next);
  }

  return (
    <div className="compact-list">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.key);
        const isExpanded = expanded.has(section.key);
        const shown = isExpanded ? section.files : section.files.slice(0, SECTION_PREVIEW);
        const hidden = section.files.length - shown.length;
        const images = shown.filter((file) => getFileVisualType(file) === "image");
        const others = shown.filter((file) => getFileVisualType(file) !== "image");
        const headingId = `section-${section.key}`;
        return (
          <section key={section.key} className="compact-section" aria-labelledby={headingId}>
            <button
              type="button"
              id={headingId}
              className="compact-section-header"
              aria-expanded={!isCollapsed}
              onClick={() => toggleCollapsed(section.key)}
            >
              <span className="compact-section-caret" aria-hidden="true">
                {isCollapsed ? "▸" : "▾"}
              </span>
              {section.title.toUpperCase()}
              <span className="compact-section-count">{section.files.length}</span>
            </button>
            {!isCollapsed && (
              <>
                {images.length > 0 && (
                  <div className="compact-grid">
                    {images.map((file) => (
                      <CompactImageTile key={file.id} file={file} now={now} sender={senderOf(file)} {...actions} />
                    ))}
                  </div>
                )}
                {others.map((file) => (
                  <CompactFileRow key={file.id} file={file} now={now} sender={senderOf(file)} {...actions} />
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    className="compact-more-chip"
                    onClick={() => setExpanded(new Set(expanded).add(section.key))}
                  >
                    +{hidden} more
                  </button>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
