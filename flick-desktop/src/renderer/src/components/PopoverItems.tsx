import { useEffect, useState } from "react";
import FileMenu from "./FileMenu";
import { thumbnailUrl } from "../thumbs";
import { useCardMenu } from "../hooks/useCardMenu";
import { formatFileSize, formatTimeLeft, getFileTileLabel, getFileVisualType, type CloudFile } from "../types";
import { stateNote, type CompactItemProps } from "./CompactFileRow";

// Redesign v2 popover items: an image on the shelf (thumbnail, name, time
// left underneath) and a file row (thumbnail, name, meta, time; "Drag" on
// hover). Both keep every action of the older compact items: drag out,
// ⋯ / right-click menu, retry, undo.

function useThumb(path: string | null | undefined): string | null {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (path) {
      void thumbnailUrl(path).then((url) => {
        if (active) setThumb(url);
      });
    }
    return () => {
      active = false;
    };
  }, [path]);
  return thumb;
}

function timeShort(file: CloudFile, now: number): string {
  // "16h left" → "16 h left" reads calmer at this size.
  return formatTimeLeft(file, now).replace(/^(\d+)([hm]) /, "$1 $2 ");
}

function Menu({ file, menu, isReady, actions }: { file: CloudFile; menu: ReturnType<typeof useCardMenu>; isReady: boolean; actions: CompactItemProps }) {
  if (!menu.menuAt) return null;
  return (
    <FileMenu
      at={menu.menuAt}
      fileName={file.name}
      canPreview={isReady}
      pinned={Boolean(file.pinned)}
      onPreview={() => actions.onPreview(file)}
      onShareLink={() => actions.onShareLink(file)}
      onRevokeShareLink={() => actions.onRevokeShareLink(file)}
      shareLinkActive={actions.hasShareLink(file)}
      onTogglePin={() => actions.onTogglePin(file)}
      onDelete={() => actions.onRemove(file)}
      onClose={menu.close}
    />
  );
}

function MoreButton({ file, menu }: { file: CloudFile; menu: ReturnType<typeof useCardMenu> }) {
  return (
    <button
      ref={menu.menuButtonRef}
      className="pv-more-btn"
      type="button"
      aria-label={`More actions for ${file.name}`}
      aria-haspopup="menu"
      aria-expanded={menu.menuAt !== null}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={menu.toggleFromButton}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h.01M12 12h.01M18 12h.01" /></svg>
    </button>
  );
}

export function ShelfItem(props: CompactItemProps & { lifted?: boolean }) {
  const { file, now, sender, onStartDrag, onRetry, pending = false, onUndo, lifted = false } = props;
  const menu = useCardMenu();
  const thumb = useThumb(file.thumb_path);
  const isReady = file.downloadState === "ready" && Boolean(file.localFileId);
  const note = stateNote(file);
  const label = [file.name, formatFileSize(file.size), note ?? formatTimeLeft(file, now), sender].filter(Boolean).join(", ");
  return (
    <article
      className={`pv-it pv-${file.downloadState}${lifted ? " is-new" : ""}${menu.menuAt ? " is-menu" : ""}`}
      onContextMenu={menu.openFromContextMenu}
      title={label}
    >
      <button
        type="button"
        className="pv-it-main"
        disabled={!isReady && file.downloadState !== "error"}
        aria-label={isReady ? `Drag ${label}` : label}
        onMouseDown={(event) => {
          if (event.button === 0 && file.localFileId) onStartDrag(file);
        }}
        onClick={() => {
          if (file.downloadState === "error") onRetry(file);
        }}
      >
        <span className="pv-im">
          {thumb ? <img src={thumb} alt="" draggable={false} /> : <span className="pv-im-label">{getFileTileLabel(file)}</span>}
          {file.pinned && <span className="pv-pin" aria-hidden="true" />}
        </span>
        <span className="pv-nm">{file.name}</span>
        <span className="pv-mt">{note ?? timeShort(file, now)}</span>
      </button>
      <MoreButton file={file} menu={menu} />
      {pending && (
        <div className="pv-undo" role="status">
          <button type="button" onClick={() => onUndo?.(file)}>Undo</button>
        </div>
      )}
      <Menu file={file} menu={menu} isReady={isReady} actions={props} />
    </article>
  );
}

function RowThumb({ file }: { file: CloudFile }) {
  const thumb = useThumb(file.thumb_path);
  const type = getFileVisualType(file);
  const ext = getFileTileLabel(file);
  if (thumb) {
    return <span className="pv-th"><img src={thumb} alt="" draggable={false} /></span>;
  }
  if (type === "document") {
    return (
      <span className="pv-th pv-th-page" aria-hidden="true">
        <b /><s /><s /><s /><s />
      </span>
    );
  }
  if (type === "archive") {
    return <span className="pv-th pv-th-zip" aria-hidden="true"><em /></span>;
  }
  const video = /^(MOV|MP4|M4V|AVI|MKV|WEBM)$/.test(ext);
  return <span className={`pv-th pv-th-ext${video ? " is-video" : ""}`} aria-hidden="true">{ext}</span>;
}

export function FileRowV2(props: CompactItemProps) {
  const { file, now, sender, onStartDrag, onRetry, pending = false, onUndo } = props;
  const menu = useCardMenu();
  if (pending) {
    return (
      <div className="pv-row pv-row-undo" role="status">
        <span>Removed {file.name}</span>
        <button type="button" onClick={() => onUndo?.(file)}>Undo</button>
      </div>
    );
  }
  const isReady = file.downloadState === "ready" && Boolean(file.localFileId);
  const failed = file.downloadState === "error" || Boolean(file.downloadError);
  const downloading = file.downloadState === "downloading";
  const meta = failed
    ? file.downloadError ?? "Download failed. Check your connection."
    : [formatFileSize(file.size), sender].filter(Boolean).join(", ");
  return (
    <article
      className={`pv-row${failed ? " is-err" : ""}${menu.menuAt ? " is-menu" : ""}`}
      onContextMenu={menu.openFromContextMenu}
      title={file.downloadError ?? file.name}
    >
      <button
        className="pv-row-main"
        type="button"
        disabled={!isReady}
        aria-label={isReady ? `Drag ${file.name} to save or share it` : `${file.name}: ${stateNote(file) ?? "already delivered"}`}
        onMouseDown={(event) => {
          if (event.button === 0 && file.localFileId) onStartDrag(file);
        }}
      >
        <RowThumb file={file} />
        <span className="pv-t">
          <span className="pv-nm">
            {file.pinned && <span className="pv-pin-dot" aria-label="Pinned" />}
            {file.name}
          </span>
          {downloading ? (
            <span className="pv-bar" aria-label="Downloading"><i /></span>
          ) : (
            <span className="pv-mt">{meta}</span>
          )}
        </span>
        {!failed && (
          <span className="pv-end">
            <span className="pv-time">{downloading ? "On its way" : timeShort(file, now).replace(" left", "")}</span>
            {isReady && (
              <span className="pv-drag" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" /></svg>
                Drag
              </span>
            )}
          </span>
        )}
      </button>
      {failed && (
        <button type="button" className="pv-retry" onClick={() => onRetry(file)}>Retry</button>
      )}
      <MoreButton file={file} menu={menu} />
      <Menu file={file} menu={menu} isReady={isReady} actions={props} />
    </article>
  );
}
