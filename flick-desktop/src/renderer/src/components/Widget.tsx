import type { Usage } from "../limits";
import type { Density } from "../density";
import { useWindowMode } from "../hooks/useWindowMode";
import { useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CloudFile } from "../types";
import type { PendingRemoval } from "../hooks/useFiles";
import FileList, { popoverSelection } from "./FileList";
import Header from "./Header";

interface WidgetProps {
  accountMenuRef: RefObject<HTMLDivElement | null>;
  authReady: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: CloudFile[];
  handleDragEnter: (event: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLElement>) => void;
  handleFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSignOut: () => void;
  isAccountMenuOpen: boolean;
  isDraggingFiles: boolean;
  isLoadingFiles: boolean;
  isOnline: boolean;
  isUploading: boolean;
  pendingRemovals: PendingRemoval[];
  deviceId: string | null;
  deviceName: string | null;
  deviceNames: Record<string, string>;
  onRenameDevice: (name: string) => Promise<string | null>;
  usage: Usage | null;
  onOutsideClick: (event: MouseEvent<HTMLElement>) => void;
  onPreviewFile: (file: CloudFile) => void;
  onStartFileDrag: (file: CloudFile) => void;
  onRemoveFile: (file: CloudFile) => void;
  onTogglePin: (file: CloudFile) => void;
  onRetryDownload: (file: CloudFile) => void;
  onUndoRemove: (fileId: string) => void;
  setIsAccountMenuOpen: (isOpen: boolean | ((current: boolean) => boolean)) => void;
  session: Session;
  showConfetti: boolean;
  arrivalPulse: number;
  uploadError: string;
  loadError: string;
  onRetryLoad: () => void;
  // Clips tab content; null when clips are off (flag or setting).
  clipsPanel: ReactNode | null;
  clipsDot: boolean;
  onOpenClips: () => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  clipboardSharing: boolean | null; // null hides the setting (flag off)
  onClipboardSharingChange: (on: boolean) => void;
}

// The menu bar popover shows this many of the newest items.
const POPOVER_ITEMS = 6;

export default function Widget({
  accountMenuRef,
  authReady,
  fileInputRef,
  files,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileSelection,
  handleSignOut,
  isAccountMenuOpen,
  isDraggingFiles,
  isLoadingFiles,
  isOnline,
  isUploading,
  pendingRemovals,
  deviceId,
  deviceName,
  deviceNames,
  onRenameDevice,
  usage,
  onOutsideClick,
  onPreviewFile,
  onStartFileDrag,
  onRemoveFile,
  onTogglePin,
  onRetryDownload,
  onUndoRemove,
  setIsAccountMenuOpen,
  session,
  showConfetti,
  arrivalPulse,
  uploadError,
  loadError,
  onRetryLoad,
  clipsPanel,
  clipsDot,
  onOpenClips,
  density,
  onDensityChange,
  clipboardSharing,
  onClipboardSharingChange,
}: WidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const [tab, setTab] = useState<"files" | "clips">("files");
  const activeTab = clipsPanel ? tab : "files";
  const windowMode = useWindowMode();
  // The popover and floating panel are always compact; the main window
  // follows the Comfy/Compact setting.
  const isPopover = windowMode === "popover";
  // "Open Flick" expands the popover in place (the main process animates the
  // resize); click-away or "Show less" brings back the compact popover.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => window.flick.onPopoverExpanded(setExpanded), []);
  const showFull = !isPopover || expanded;
  // The compact popover and the floating panel are always compact; the main
  // window and the expanded popover follow the Comfy/Compact setting.
  const effectiveDensity: Density = windowMode === "main" || (isPopover && expanded) ? density : "compact";
  const popoverHidden = isPopover && !expanded ? popoverSelection(files, POPOVER_ITEMS).hidden : 0;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  // Popover: report the natural height (header + all content + footer) so
  // the main process can size the window to it; the list scrolls past the cap.
  const widgetRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const widget = widgetRef.current;
    if (!isPopover || !widget) {
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const content = widget.querySelector<HTMLElement>(".content");
        if (!content) {
          return;
        }
        // Natural content height from where its last child ends (scrollHeight
        // can't shrink below the current box, so the popover would never shrink).
        const box = content.getBoundingClientRect();
        let bottom = 0;
        for (const child of Array.from(content.children)) {
          bottom = Math.max(bottom, child.getBoundingClientRect().bottom - box.top + content.scrollTop);
        }
        const padding = parseFloat(getComputedStyle(content).paddingBottom) || 0;
        const chrome = widget.offsetHeight - content.clientHeight; // header, footer, borders
        window.flick.reportPopoverHeight(chrome + bottom + padding, expandedRef.current);
      });
    };
    const resize = new ResizeObserver(measure);
    const observeAll = () => {
      resize.disconnect();
      widget.querySelectorAll(".content > *, .content .compact-list").forEach((node) => resize.observe(node));
      measure();
    };
    const mutations = new MutationObserver(observeAll);
    mutations.observe(widget, { childList: true, subtree: true });
    observeAll();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [isPopover, expanded]);

  return (
    <main
      ref={widgetRef}
      className={`widget${isDraggingFiles ? " drag-active" : ""}${effectiveDensity === "compact" ? " widget-compact" : ""}${isPopover ? " widget-popover" : ""}${isPopover && expanded ? " widget-expanded" : ""}`}
      onClickCapture={onOutsideClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="drop-overlay" aria-hidden="true">
          Drop files to upload to Flick
        </div>
      )}
      {showConfetti && !prefersReducedMotion && (
        <div className="confetti-burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      )}
      <Header
        accountMenuRef={accountMenuRef}
        authReady={authReady}
        isAccountMenuOpen={isAccountMenuOpen}
        isOnline={isOnline}
        onSignOut={handleSignOut}
        deviceName={deviceName}
        onRenameDevice={onRenameDevice}
        usage={usage}
        windowMode={windowMode}
        onPopOut={isPopover && expanded ? () => window.flick.openMainWindow() : undefined}
        density={density}
        onDensityChange={onDensityChange}
        clipboardSharing={clipboardSharing}
        onClipboardSharingChange={onClipboardSharingChange}
        setIsAccountMenuOpen={setIsAccountMenuOpen}
        session={session}
        arrivalPulse={arrivalPulse}
      />
      <section className="content" aria-labelledby="incoming-heading">
        {clipsPanel && (
          <div className="home-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className="home-tab"
              aria-selected={activeTab === "files"}
              onClick={() => setTab("files")}
            >
              Files
            </button>
            <button
              type="button"
              role="tab"
              className="home-tab"
              aria-selected={activeTab === "clips"}
              aria-label={clipsDot && activeTab !== "clips" ? "Clips, new" : "Clips"}
              onClick={() => {
                setTab("clips");
                onOpenClips();
              }}
            >
              Clips
              {clipsDot && activeTab !== "clips" && (
                <span className="home-tab-dot" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
        {activeTab === "clips" ? clipsPanel : (
        <FileList
          files={files}
          fileInputRef={fileInputRef}
          isLoadingFiles={isLoadingFiles}
          isUploading={isUploading}
          uploadError={uploadError}
          loadError={loadError}
          onRetryLoad={onRetryLoad}
          pendingRemovals={pendingRemovals}
          deviceId={deviceId}
          deviceNames={deviceNames}
          density={effectiveDensity}
          recentOnly={showFull ? undefined : POPOVER_ITEMS}
          onShowMore={() => setExpanded(true)}
          onFileSelection={handleFileSelection}
          onPreview={onPreviewFile}
          onStartDrag={onStartFileDrag}
          onRemove={onRemoveFile}
          onTogglePin={onTogglePin}
          onRetryDownload={onRetryDownload}
          onUndoRemove={onUndoRemove}
        />
        )}
      </section>
      {isPopover ? (
        // Always visible: the list scrolls above it.
        <footer className="popover-footer">
          {expanded ? (
            <button type="button" className="popover-open" onClick={() => setExpanded(false)}>
              Show less
            </button>
          ) : (
            <button type="button" className="popover-open" onClick={() => setExpanded(true)}>
              {popoverHidden > 0 ? `Open Flick · +${popoverHidden} more` : "Open Flick"}
            </button>
          )}
        </footer>
      ) : (
        <footer className="footer">
          <span className="helper-icon" aria-hidden="true">
            ↓
          </span>
          <span>Drop files here, or flick something over!</span>
        </footer>
      )}
    </main>
  );
}
