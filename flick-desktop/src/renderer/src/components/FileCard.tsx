import { motion, useReducedMotion } from "framer-motion";
import { designTokens } from "../../../design/tokens";
import {
  CloudFile,
  formatExpiry,
  formatFileSize,
  getFileTileLabel,
  getFileVisualType,
} from "../types";

interface FileCardProps {
  file: CloudFile;
  index: number;
  now: number;
  onPreview: (file: CloudFile) => void;
  onStartDrag: (file: CloudFile) => void;
  onRemove: (file: CloudFile) => void;
  onRetry: (file: CloudFile) => void;
}

export default function FileCard({
  file,
  index,
  now,
  onPreview,
  onStartDrag,
  onRemove,
  onRetry,
}: FileCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const visualType = getFileVisualType(file);
  const isReady = file.downloadState === "ready" && Boolean(file.localFileId);
  const stateLabel =
    file.downloadState === "downloading"
      ? "On its way…"
      : file.downloadState === "ready"
        ? file.downloadError
          ? "Got it! · delivery update failed"
          : "Got it!"
        : file.downloadState === "error"
          ? "Couldn’t download · retry"
          : "Already delivered";

  return (
    <motion.article
      className={`file-card file-card-${visualType} file-card-${file.downloadState}`}
      key={file.id}
      title={file.downloadError}
      layout={!prefersReducedMotion}
      initial={
        prefersReducedMotion
          ? { opacity: 1 }
          : { opacity: 0, y: 16, rotate: index % 2 === 0 ? -2 : 2 }
      }
      animate={{
        opacity: 1,
        y: 0,
        rotate: prefersReducedMotion ? 0 : index % 2 === 0 ? -0.8 : 0.6,
      }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, x: 40, rotate: 8 }
      }
      transition={{
        layout: {
          type: "spring",
          stiffness: designTokens.springs.newCard.stiffness,
          damping: designTokens.springs.newCard.damping,
        },
        default: prefersReducedMotion
          ? { duration: 0 }
          : {
              type: "spring",
              stiffness: designTokens.springs.newCard.stiffness,
              damping: designTokens.springs.newCard.damping,
              mass: designTokens.springs.newCard.mass,
            },
      }}
      whileHover={
        isReady && !prefersReducedMotion
          ? {
              y: -4,
              rotate: 0,
              scale: 1.01,
              transition: {
                type: "spring",
                stiffness: designTokens.springs.dragCard.stiffness,
                damping: designTokens.springs.dragCard.damping,
                mass: designTokens.springs.dragCard.mass,
              },
            }
          : undefined
      }
      whileTap={
        isReady && !prefersReducedMotion
          ? {
              y: -4,
              rotate: -1.5,
              scale: 0.99,
              transition: {
                type: "spring",
                stiffness: designTokens.springs.dragCard.stiffness,
                damping: designTokens.springs.dragCard.damping,
                mass: designTokens.springs.dragCard.mass,
              },
            }
          : undefined
      }
    >
      <button
        className="file-drag-button"
        type="button"
        disabled={!isReady}
        aria-label={
          isReady
            ? `Drag ${file.name} to save or share it`
            : `${file.name}: ${file.downloadState === "downloading" ? "downloading" : file.downloadState === "error" ? "download failed" : "already delivered"}`
        }
        onMouseDown={(event) => {
          if (event.button === 0 && file.localFileId) {
            onStartDrag(file);
          }
        }}
      >
        <span className="file-icon" aria-hidden="true">
          {visualType === "image" ? (
            <svg viewBox="0 0 32 32">
              <rect x="5" y="7" width="22" height="18" rx="4" />
              <circle cx="12" cy="13" r="2" />
              <path d="m7 22 6-6 4 4 3-3 5 5" />
            </svg>
          ) : (
            <span className="file-type-label">{getFileTileLabel(file)}</span>
          )}
        </span>
        <span className="file-details">
          <span className="file-name">{file.name}</span>
          <span className="file-meta">
            {formatFileSize(file.size)}
            <span className="meta-divider" aria-hidden="true">
              ·
            </span>
            <span className={`file-state file-state-${file.downloadState}`}>
              {file.downloadState === "downloading" && (
                <svg className="progress-ring" viewBox="0 0 28 28">
                  <circle
                    className="progress-ring-track"
                    cx="14"
                    cy="14"
                    r="11"
                  />
                  <circle
                    className="progress-ring-progress"
                    cx="14"
                    cy="14"
                    r="11"
                  />
                </svg>
              )}
              {file.downloadState === "ready" && (
                <span className="state-sparkle" aria-hidden="true">
                  ✦
                </span>
              )}
              {file.downloadState === "error" && (
                <span className="state-error-dot" aria-hidden="true" />
              )}
              {stateLabel}
            </span>
            <span className="meta-divider" aria-hidden="true">
              ·
            </span>
            <span className="file-expiry">{formatExpiry(file.created_at, now)}</span>
          </span>
        </span>
        {isReady && <span className="drag-me-pill">drag me ↗</span>}
      </button>
      <div className="file-card-actions">
        <span className="file-action-wrap" data-tooltip="Preview">
          <button
            className="file-action-button"
            type="button"
            aria-label={`Preview ${file.name}`}
            title="Preview"
            disabled={!isReady}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onPreview(file);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.7" />
            </svg>
          </button>
          <span className="file-action-tooltip" aria-hidden="true">
            Preview
          </span>
        </span>
        <span className="file-action-wrap" data-tooltip="Remove from Flick">
          <button
            className="file-action-button"
            type="button"
            aria-label={`Remove ${file.name} from Flick`}
            title="Remove from Flick"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(file);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <span className="file-action-tooltip" aria-hidden="true">
            Remove from Flick
          </span>
        </span>
      </div>
      {(file.downloadState === "error" || file.downloadError) && (
        <button
          className="retry-download-button"
          type="button"
          aria-label={`Retry downloading ${file.name}`}
          onClick={() => onRetry(file)}
        >
          Retry
        </button>
      )}
    </motion.article>
  );
}
