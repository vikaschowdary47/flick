// Dev-only preview of the widget in one state, for checking layouts and
// taking screenshots without a signed-in account. Not used by the app.
import { createRef } from "react";
import ReactDOM from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/800.css";
import { designTokenCssVariables } from "../../design/tokens";
import Widget from "./components/Widget";
import type { CloudFile } from "./types";
import "./styles.css";

for (const [name, value] of Object.entries(designTokenCssVariables)) {
  document.documentElement.style.setProperty(name, value);
}

const state = new URLSearchParams(location.search).get("state") ?? "files";
const now = Date.now();
const file = (n: number, name: string, mime: string, hoursAgo: number, pinned = false): CloudFile => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  user_id: "preview",
  name,
  size: [180_000, 2_400_000, 12_000_000][n % 3],
  mime_type: mime,
  storage_path: `preview/${name}`,
  created_at: new Date(now - hoursAgo * 3_600_000).toISOString(),
  delivered_at: new Date(now).toISOString(),
  pinned,
  pinned_at: pinned ? new Date(now).toISOString() : null,
  device_id: null,
  thumb_path: null,
  downloadState: "ready",
  localFileId: `local-${n}`,
});
const sample: CloudFile[] = [
  file(1, "invoice-october.pdf", "application/pdf", 1, true),
  file(2, "design-assets.zip", "application/zip", 3),
  file(3, "notes.txt", "text/plain", 6),
];

const noop = () => {};
const session = { user: { id: "preview", email: "you@example.com" } } as unknown as Session;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Widget
    accountMenuRef={createRef<HTMLDivElement>()}
    authReady
    fileInputRef={createRef<HTMLInputElement>()}
    files={state === "files" ? sample : []}
    handleDragEnter={noop}
    handleDragLeave={noop}
    handleDragOver={noop}
    handleDrop={noop}
    handleFileSelection={noop}
    handleSignOut={noop}
    isAccountMenuOpen={false}
    isDraggingFiles={false}
    isLoadingFiles={state === "loading"}
    isOnline
    isUploading={false}
    pendingRemovals={[]}
    deviceId={null}
    deviceName={null}
    deviceNames={{}}
    onRenameDevice={async () => null}
    usage={null}
    onOutsideClick={noop}
    onPreviewFile={noop}
    onStartFileDrag={noop}
    onRemoveFile={noop}
    onTogglePin={noop}
    onRetryDownload={noop}
    onUndoRemove={noop}
    setIsAccountMenuOpen={noop}
    session={session}
    showConfetti={false}
    arrivalPulse={0}
    uploadError=""
    loadError={
      state === "error"
        ? "Could not load your files. (permission denied for table files · code 42501)"
        : ""
    }
    onRetryLoad={noop}
    clipsPanel={null}
    clipsDot={false}
    onOpenClips={noop}
    density="compact"
    onDensityChange={noop}
    clipboardSharing={null}
    onClipboardSharingChange={noop}
  />,
);
