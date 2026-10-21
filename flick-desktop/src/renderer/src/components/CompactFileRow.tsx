import FileMenu from "./FileMenu";
import { useCardMenu } from "../hooks/useCardMenu";
import {
  CloudFile,
  formatFileSize,
  formatTimeLeft,
  getFileTileLabel,
  getFileVisualType,
} from "../types";

export interface CompactItemProps {
  file: CloudFile;
  now: number;
  sender: string; // "from …" or empty
  onPreview: (file: CloudFile) => void;
  onStartDrag: (file: CloudFile) => void;
  onRemove: (file: CloudFile) => void;
  onTogglePin: (file: CloudFile) => void;
  onRetry: (file: CloudFile) => void;
  // Removed but still undoable: show the slim inline strip instead.
  pending?: boolean;
  onUndo?: (file: CloudFile) => void;
}

const PIN_PATH = "M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7";

export function stateNote(file: CloudFile): string | null {
  if (file.downloadState === "downloading") {
    return "On its way…";
  }
  if (file.downloadState === "error") {
    return "Couldn’t download";
  }
  return null;
}

// One compact file row (~48px): sticker icon colored by type, name, then
// size · time left. Same actions as the big card: drag out, ⋯ / right-click
// menu (Preview, Pin, Delete), retry.
export default function CompactFileRow({
  file,
  now,
  sender,
  onPreview,
  onStartDrag,
  onRemove,
  onTogglePin,
  onRetry,
  pending = false,
  onUndo,
}: CompactItemProps) {
  const menu = useCardMenu();
  if (pending) {
    // In place of the row; it collapses by itself after 5s (CSS), when the
    // delete goes through and the file leaves the list.
    return (
      <div className="undo-strip" role="status">
        <span>Removed</span>
        <button type="button" className="undo-strip-button" onClick={() => onUndo?.(file)}>
          Undo
        </button>
      </div>
    );
  }
  const visualType = getFileVisualType(file);
  const isReady = file.downloadState === "ready" && Boolean(file.localFileId);
  const note = stateNote(file);
  const meta = [formatFileSize(file.size), note ?? formatTimeLeft(file, now), sender]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`compact-row compact-${visualType} compact-${file.downloadState}${menu.menuAt ? " compact-menu-open" : ""}`}
      onContextMenu={menu.openFromContextMenu}
      title={file.downloadError ?? file.name}
    >
      <button
        className="compact-main"
        type="button"
        disabled={!isReady}
        aria-label={isReady ? `Drag ${file.name} to save or share it` : `${file.name}: ${note ?? "already delivered"}`}
        onMouseDown={(event) => {
          if (event.button === 0 && file.localFileId) {
            onStartDrag(file);
          }
        }}
      >
        <span className="compact-icon" aria-hidden="true">
          {getFileTileLabel(file)}
        </span>
        <span className="compact-text">
          <span className="compact-name">
            {file.pinned && (
              <svg className="compact-pin" viewBox="0 0 24 24" aria-label="Pinned">
                <path d={PIN_PATH} />
              </svg>
            )}
            {file.name}
          </span>
          <span className="compact-meta">{meta}</span>
        </span>
      </button>
      {(file.downloadState === "error" || file.downloadError) && (
        <button type="button" className="compact-retry" onClick={() => onRetry(file)}>
          Retry
        </button>
      )}
      <button
        ref={menu.menuButtonRef}
        className="compact-more"
        type="button"
        aria-label={`More actions for ${file.name}`}
        aria-haspopup="menu"
        aria-expanded={menu.menuAt !== null}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={menu.toggleFromButton}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {menu.menuAt && (
        <FileMenu
          at={menu.menuAt}
          fileName={file.name}
          canPreview={isReady}
          pinned={Boolean(file.pinned)}
          onPreview={() => onPreview(file)}
          onTogglePin={() => onTogglePin(file)}
          onDelete={() => onRemove(file)}
          onClose={menu.close}
        />
      )}
    </article>
  );
}
