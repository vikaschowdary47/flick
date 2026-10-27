import type { Usage } from "../limits";
import type { Density } from "../density";
import { useWindowMode } from "../hooks/useWindowMode";
import { useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CloudFile } from "../types";
import type { PendingRemoval } from "../hooks/useFiles";
import FileList, { popoverSelection } from "./FileList";
import SettingsPanel from "./SettingsPanel";
import Header from "./Header";
import PopoverHeader from "./PopoverHeader";
import { APP_NAME } from "../../../shared/appName";

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
  onDeleteAccount?: () => Promise<string | null>;
  isDeletingAccount?: boolean;
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
  onShareLink: (file: CloudFile) => void;
  onRevokeShareLink: (file: CloudFile) => void;
  hasShareLink: (file: CloudFile) => boolean;
  onTogglePin: (file: CloudFile) => void;
  onRetryDownload: (file: CloudFile) => void;
  onUndoRemove: (fileId: string) => void;
  setIsAccountMenuOpen: (isOpen: boolean | ((current: boolean) => boolean)) => void;
  session: Session;
  showConfetti: boolean;
  arrivalPulse: number;
  uploadError: string;
  shareStatus: string;
  loadError: string;
  onRetryLoad: () => void;
  // Clips tab content; null when clips are off (flag or setting).
  // Renders the Clips tab (null when clips are off). The popover passes how
  // many clips to show and forces compact chips.
  clipsPanel: ((view: { popover: boolean; limit?: number }) => ReactNode) | null;
  clipsCount: number;
  // Lets the app load usage while the popover's settings panel is open.
  onSettingsVisibleChange?: (visible: boolean) => void;
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
  onDeleteAccount,
  isDeletingAccount = false,
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
  onShareLink,
  onRevokeShareLink,
  hasShareLink,
  onTogglePin,
  onRetryDownload,
  onUndoRemove,
  setIsAccountMenuOpen,
  session,
  showConfetti,
  arrivalPulse,
  uploadError,
  shareStatus,
  loadError,
  onRetryLoad,
  clipsPanel,
  clipsCount,
  onSettingsVisibleChange,
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
  // "Open eqlShare" expands the popover in place (the main process animates the
  // resize); click-away or "Show less" brings back the compact popover.
  const [expanded, setExpanded] = useState(false);
  // Popover settings panel (replaces the list). Hiding the popover resets
  // both, so the next open shows the compact file list.
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => window.flick.onOpenSettings(() => { setExpanded(true); setSettingsOpen(true); }), []);
  useEffect(
    () =>
      window.flick.onPopoverExpanded((next) => {
        setExpanded(next);
        if (!next) {
          setSettingsOpen(false);
        }
      }),
    [],
  );
  const isPanel = windowMode === "panel";
  const showSettings = (isPopover || isPanel) && settingsOpen;
  useEffect(() => onSettingsVisibleChange?.(showSettings), [showSettings, onSettingsVisibleChange]);
  // The popover (compact or taller) and the floating panel are always
  // compact; only the separate main window follows the Comfy/Compact setting.
  const effectiveDensity: Density = windowMode === "main" ? density : "compact";
  // Footer "+N more" counts whatever the active tab hides.
  const popoverHidden =
    isPopover && !expanded
      ? activeTab === "clips"
        ? Math.max(0, clipsCount - POPOVER_ITEMS)
        : popoverSelection(files, POPOVER_ITEMS).hidden
      : 0;
  // The settings panel sizes like the taller popover (same max height).
  const expandedRef = useRef(expanded || showSettings);
  expandedRef.current = expanded || showSettings;

  // Popover: report the natural height (header + all content + footer) so
  // the main process can size the window to it; the list scrolls past the cap.
  const widgetRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const widget = widgetRef.current;
    if (!isPopover || !widget) {
      return;
    }
    let frame = 0;
    let timer = 0;
    // A hidden window gets no animation frames, so measure with a timer then:
    // the size is right before the popover shows again (no jump on open).
    const nextFrame = (callback: () => void) => {
      if (document.hidden) timer = window.setTimeout(callback, 0);
      else frame = requestAnimationFrame(callback);
    };
    const measure = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      nextFrame(() => {
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
        // A limit screen is drawn over the popover: make room for all of it
        // (it sizes like the taller popover).
        const limitScreen = document.querySelector<HTMLElement>(".limit-screen");
        if (limitScreen) {
          const overlayPadding = 28;
          window.flick.reportPopoverHeight(
            Math.max(chrome + bottom + padding, limitScreen.scrollHeight + overlayPadding),
            true,
          );
          return;
        }
        const authMinimum = widget.classList.contains("widget-auth") ? 520 : 0;
        window.flick.reportPopoverHeight(Math.max(authMinimum, chrome + bottom + padding), expandedRef.current);
      });
    };
    const resize = new ResizeObserver(measure);
    const observeAll = () => {
      resize.disconnect();
      widget.querySelectorAll(".content > *, .content .compact-list").forEach((node) => resize.observe(node));
      document.querySelectorAll(".limit-screen").forEach((node) => resize.observe(node));
      measure();
    };
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });
    observeAll();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [isPopover, expanded, showSettings]);

  return (
    <main
      inert={isDeletingAccount}
      ref={widgetRef}
      className={`widget${isDraggingFiles ? " drag-active" : ""}${effectiveDensity === "compact" ? " widget-compact" : ""}${isPopover ? " widget-popover" : ""}${isPopover && expanded ? " widget-expanded" : ""}${isPopover || isPanel ? " widget-v2" : ""}${isPanel ? " widget-panel" : ""}`}
      onClickCapture={onOutsideClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="drop-overlay" aria-hidden="true">
          <span>
            <svg viewBox="0 0 24 24"><path d="M12 3.5v10M7.5 9.5 12 14l4.5-4.5M3.5 14.5v3A2.5 2.5 0 0 0 6 20h12a2.5 2.5 0 0 0 2.5-2.5v-3" /></svg>
            Release to send with {APP_NAME}
          </span>
        </div>
      )}
      {showConfetti && !prefersReducedMotion && (
        <div className="confetti-burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      )}
      {isPopover || isPanel ? (
        <PopoverHeader
          isOnline={isOnline}
          signedIn={Boolean(session)}
          otherDevices={Object.entries(deviceNames)
            .filter(([id]) => id !== deviceId)
            .map(([, name]) => name)}
          arrivalPulse={arrivalPulse}
          settingsOpen={showSettings}
          onBack={() => setSettingsOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onAddFiles={() => fileInputRef.current?.click()}
          isUploading={isUploading}
          onPopOut={isPopover && expanded && !showSettings ? () => window.flick.openMainWindow() : undefined}
          onClose={isPanel ? () => window.flick.hideWindow() : undefined}
        />
      ) : (
        <Header
        accountMenuRef={accountMenuRef}
        authReady={authReady}
        isAccountMenuOpen={isAccountMenuOpen}
        isOnline={isOnline}
        onSignOut={handleSignOut}
        onDeleteAccount={onDeleteAccount}
        deviceName={deviceName}
        onRenameDevice={onRenameDevice}
        usage={usage}
        windowMode={windowMode}
        onPopOut={isPopover && expanded && !showSettings ? () => window.flick.openMainWindow() : undefined}
        onOpenSettings={isPopover || isPanel ? () => setSettingsOpen(true) : undefined}
        settingsOpen={showSettings}
        onBack={() => setSettingsOpen(false)}
        density={density}
        onDensityChange={onDensityChange}
        clipboardSharing={clipboardSharing}
        onClipboardSharingChange={onClipboardSharingChange}
        onAddFiles={(isPopover || isPanel) && session ? () => fileInputRef.current?.click() : undefined}
        isUploading={isUploading}
        setIsAccountMenuOpen={setIsAccountMenuOpen}
        session={session}
        arrivalPulse={arrivalPulse}
      />
      )}
      <section className="content" aria-labelledby="incoming-heading">
        {showSettings ? (
          <SettingsPanel
            email={session.user.email ?? null}
            usage={usage}
            clipboardSharing={clipboardSharing}
            onClipboardSharingChange={onClipboardSharingChange}
            onSignOut={handleSignOut}
            onDeleteAccount={onDeleteAccount}
            deviceName={deviceName}
            onRenameDevice={onRenameDevice}
          />
        ) : (
        <>
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
        {activeTab === "clips" && clipsPanel ? (
          clipsPanel({ popover: isPopover || isPanel, limit: isPopover && !expanded ? POPOVER_ITEMS : undefined })
        ) : (
        <FileList
          files={files}
          fileInputRef={fileInputRef}
          isLoadingFiles={isLoadingFiles}
          isUploading={isUploading}
          uploadError={uploadError}
          shareStatus={shareStatus}
          loadError={loadError}
          usage={usage}
          onRetryLoad={onRetryLoad}
          pendingRemovals={pendingRemovals}
          deviceId={deviceId}
          deviceNames={deviceNames}
          density={effectiveDensity}
          // Popover: the same compact list either way; taller shows every item.
          recentOnly={isPopover ? (expanded ? Number.POSITIVE_INFINITY : POPOVER_ITEMS) : isPanel ? Number.POSITIVE_INFINITY : undefined}
          onShowMore={() => setExpanded(true)}
          onFileSelection={handleFileSelection}
          onPreview={onPreviewFile}
          onStartDrag={onStartFileDrag}
          onRemove={onRemoveFile}
          onShareLink={onShareLink}
          onRevokeShareLink={onRevokeShareLink}
          hasShareLink={hasShareLink}
          onTogglePin={onTogglePin}
          onRetryDownload={onRetryDownload}
          onUndoRemove={onUndoRemove}
        />
        )}
        </>
        )}
      </section>
      {showSettings ? null : isPopover || isPanel ? (
        // Always visible: the list scrolls above it. The whole window is the
        // drop target; the hint doubles as a button for the file picker.
        <footer className="pv-foot">
          <button type="button" className="pv-foot-drop" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v10M7.5 9.5 12 14l4.5-4.5M3.5 14.5v3A2.5 2.5 0 0 0 6 20h12a2.5 2.5 0 0 0 2.5-2.5v-3" /></svg>
            {isUploading ? "Sending…" : activeTab === "clips" ? "Drop text or files to send" : "Drop files here to send"}
          </button>
          <span className="pv-grow" />
          {isPopover && expanded ? (
            <button type="button" className="pv-foot-link" onClick={() => setExpanded(false)}>
              Show less
            </button>
          ) : isPopover && popoverHidden > 0 ? (
            <button type="button" className="pv-foot-link" onClick={() => setExpanded(true)}>
              Show all <span className="pv-kbd">+{popoverHidden}</span>
            </button>
          ) : clipboardSharing ? (
            <span className="pv-foot-hint">
              Send clipboard <span className="pv-kbd">{navigator.platform.startsWith("Mac") ? "⌥⇧C" : "Alt+Shift+C"}</span>
            </span>
          ) : null}
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
