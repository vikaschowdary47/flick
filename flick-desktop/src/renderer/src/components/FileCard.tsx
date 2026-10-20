import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import FileMenu from "./FileMenu";
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
  sender: string; // "from …" or empty
  onPreview: (file: CloudFile) => void;
  onStartDrag: (file: CloudFile) => void;
  onRemove: (file: CloudFile) => void;
  onTogglePin: (file: CloudFile) => void;
  onRetry: (file: CloudFile) => void;
}

export default function FileCard({
  file,
  index,
  now,
  sender,
  onPreview,
  onStartDrag,
  onRemove,
  onTogglePin,
  onRetry,
}: FileCardProps) {
  // Where the ⋯ menu is open (window coordinates), or null when closed.
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
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
      className={`file-card file-card-${visualType} file-card-${file.downloadState}${menuAt ? " file-card-menu-open" : ""}`}
      onContextMenu={(event) => {
        // Right-click, or the context-menu key / Shift+F10 on a focused card.
        event.preventDefault();
        const fromKeyboard = event.clientX === 0 && event.clientY === 0;
        const rect = (menuButtonRef.current ?? event.currentTarget).getBoundingClientRect();
        setMenuAt(
          fromKeyboard
            ? { x: rect.right, y: rect.bottom + 6 }
            : { x: event.clientX, y: event.clientY },
        );
      }}
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
          <span className="file-name">
            {file.pinned && (
              <span className="pin-badge" title="Pinned" aria-label="Pinned">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7" />
                </svg>
              </span>
            )}
            {file.name}
          </span>
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
            {sender && (
              <>
                <span className="meta-divider" aria-hidden="true">
                  ·
                </span>
                <span className="file-sender" title={sender}>
                  {sender}
                </span>
              </>
            )}
          </span>
        </span>
        {isReady && <span className="drag-me-pill">drag me ↗</span>}
      </button>
      <div className="file-card-actions">
        <button
          ref={menuButtonRef}
          className="file-action-button file-menu-button"
          type="button"
          aria-label={`More actions for ${file.name}`}
          aria-haspopup="menu"
          aria-expanded={menuAt !== null}
          title="More"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (menuAt) {
              setMenuAt(null);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            setMenuAt({ x: rect.right, y: rect.bottom + 6 });
          }}
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </div>
      {menuAt && (
        <FileMenu
          at={menuAt}
          fileName={file.name}
          canPreview={isReady}
          pinned={Boolean(file.pinned)}
          onPreview={() => onPreview(file)}
          onTogglePin={() => onTogglePin(file)}
          onDelete={() => onRemove(file)}
          onClose={(restoreFocus) => {
            setMenuAt(null);
            if (restoreFocus) {
              menuButtonRef.current?.focus();
            }
          }}
        />
      )}
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
