import { useEffect, useState } from "react";
import FileMenu from "./FileMenu";
import { thumbnailUrl } from "../thumbs";
import { useCardMenu } from "../hooks/useCardMenu";
import { formatFileSize, formatTimeLeft, getFileTileLabel } from "../types";
import { stateNote, type CompactItemProps } from "./CompactFileRow";

// One square in the compact image grid: the ~200px thumbnail when there is
// one, otherwise a colored sticker tile. Drag it out like a row.
export default function CompactImageTile({
  file,
  now,
  sender,
  onPreview,
  onStartDrag,
  onRemove,
  onTogglePin,
  onRetry,
}: CompactItemProps) {
  const menu = useCardMenu();
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (file.thumb_path) {
      void thumbnailUrl(file.thumb_path).then((url) => {
        if (active) {
          setThumb(url);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [file.thumb_path]);
  const isReady = file.downloadState === "ready" && Boolean(file.localFileId);
  const note = stateNote(file);
  const label = [file.name, formatFileSize(file.size), note ?? formatTimeLeft(file.created_at, now), sender]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`compact-tile compact-${file.downloadState}${menu.menuAt ? " compact-menu-open" : ""}`}
      onContextMenu={menu.openFromContextMenu}
      title={label}
    >
      <button
        type="button"
        className="compact-tile-main"
        disabled={!isReady && file.downloadState !== "error"}
        aria-label={isReady ? `Drag ${label}` : label}
        onMouseDown={(event) => {
          if (event.button === 0 && file.localFileId) {
            onStartDrag(file);
          }
        }}
        onClick={() => {
          if (file.downloadState === "error") {
            onRetry(file);
          }
        }}
      >
        {thumb ? (
          <img className="compact-tile-thumb" src={thumb} alt="" draggable={false} />
        ) : (
          <span className="compact-tile-label">{getFileTileLabel(file)}</span>
        )}
        {file.pinned && <span className="compact-tile-pin" aria-hidden="true" />}
        <span className="compact-tile-time">{note ?? formatTimeLeft(file.created_at, now)}</span>
      </button>
      <button
        ref={menu.menuButtonRef}
        className="compact-more compact-tile-more"
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
