import type { Usage } from "../limits";
import type { Density } from "../density";
import { useWindowMode } from "../hooks/useWindowMode";
import { useReducedMotion } from "framer-motion";
import { useState, type ChangeEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CloudFile } from "../types";
import type { PendingRemoval } from "../hooks/useFiles";
import FileList from "./FileList";
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
  // Clips tab content; null when clips are off (flag or setting).
  clipsPanel: ReactNode | null;
  clipsDot: boolean;
  onOpenClips: () => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  clipboardSharing: boolean | null; // null hides the setting (flag off)
  onClipboardSharingChange: (on: boolean) => void;
}

// The popover shows this many recent items (8 rows fit in the 580px popover).
const POPOVER_ITEMS = 8;

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
  const effectiveDensity: Density = windowMode === "main" ? density : "compact";

  return (
    <main
      className={`widget${isDraggingFiles ? " drag-active" : ""}${effectiveDensity === "compact" ? " widget-compact" : ""}${windowMode === "popover" ? " widget-popover" : ""}`}
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
          pendingRemovals={pendingRemovals}
          deviceId={deviceId}
          deviceNames={deviceNames}
          density={effectiveDensity}
          recentOnly={windowMode === "popover" ? POPOVER_ITEMS : undefined}
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
      <footer className="footer">
        <span className="helper-icon" aria-hidden="true">
          ↓
        </span>
        <span>Drop files here, or flick something over!</span>
      </footer>
    </main>
  );
}
