// Dev-only preview of the widget in one state, for checking layouts and
// taking screenshots without a signed-in account. Not used by the app.
import { createRef } from "react";
import ReactDOM from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/800.css";
import { designTokenCssVariables } from "../../design/tokens";
import ClipsPanel from "./components/ClipsPanel";
import LimitScreen from "./components/LimitScreen";
import Widget from "./components/Widget";
import type { ClipRow } from "./clips";
import type { CloudFile } from "./types";
import "./styles.css";

for (const [name, value] of Object.entries(designTokenCssVariables)) {
  document.documentElement.style.setProperty(name, value);
}

const params = new URLSearchParams(location.search);
const state = params.get("state") ?? "files";
// state=mixed&files=N&clips=M: N files and M clips (Clips tab available).
const fileCount = Number(params.get("files") ?? 0);
const clipCount = Number(params.get("clips") ?? 0);
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

// state=many: 20 files across Pinned / Today / Earlier, some of them images.
const many: CloudFile[] = Array.from({ length: 20 }, (_, i) =>
  i % 4 === 0
    ? file(i, `photo-${i + 1}.jpg`, "image/jpeg", i * 1.1, i === 0)
    : file(i, `document-${i + 1}.pdf`, "application/pdf", i * 1.1),
);

const mixed: CloudFile[] = Array.from({ length: fileCount }, (_, i) =>
  file(i, `document-${i + 1}.pdf`, "application/pdf", i * 1.3),
);
const clipTexts = [
  "https://www.figma.com/design/abc123/Flick-mobile-compact-layout?node-id=42-1337&t=averyveryverylongquerystring",
  "Meeting moved to 3pm — bring the October numbers\nand the deck",
  "https://github.com/vikas/flick/pull/12",
];
const sampleClips: ClipRow[] = Array.from({ length: clipCount }, (_, i) => ({
  id: `clip-${i}`,
  user_id: "preview",
  device_id: "phone",
  kind: clipTexts[i % 3].startsWith("http") ? "link" : "text",
  content: clipTexts[i % 3],
  created_at: new Date(now - (i * 3 + 10) * 3_600_000).toISOString(),
  expires_at: new Date(now + 3_600_000).toISOString(),
}));

const noop = () => {};
const session = { user: { id: "preview", email: "you@example.com" } } as unknown as Session;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
  {state === "limit" && (
    <LimitScreen
      limit="storage"
      usage={{ plan: "free", pinsUsed: 1, maxPins: 3, storageUsedBytes: 500 * 1024 * 1024, maxStorageMb: 500, devicesUsed: 3, maxDevices: 4 }}
      email="you@example.com"
      devices={[]}
      thisDeviceId={null}
      onRemoveDevice={async () => null}
      paymentsEnabled={false}
      onClose={noop}
    />
  )}
  <Widget
    accountMenuRef={createRef<HTMLDivElement>()}
    authReady
    fileInputRef={createRef<HTMLInputElement>()}
    files={state === "files" ? sample : state === "many" ? many : state === "mixed" ? mixed : []}
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
    // pending=1: the first image and the second file were just removed.
    pendingRemovals={
      params.has("pending") ? [many[0], many[1]].map((removed) => ({ id: removed.id, file: removed })) : []
    }
    deviceId={null}
    deviceName="Vikas's MacBook"
    deviceNames={{}}
    onRenameDevice={async () => null}
    usage={{
      plan: "free",
      pinsUsed: 1,
      maxPins: 3,
      storageUsedBytes: 420 * 1024 * 1024, // 84%: shows the coral bar
      maxStorageMb: 500,
      devicesUsed: 3,
      maxDevices: 4,
    }}
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
    clipsCount={sampleClips.length}
    clipsPanel={
      state === "mixed"
        ? (view) => (
            <ClipsPanel
              clips={sampleClips}
              error=""
              deviceId="mac"
              deviceNames={{ phone: "Vikas's iPhone" }}
              onSend={async () => null}
              onDelete={noop}
              sendStatus=""
              density="compact"
              popover={view.popover}
              limit={view.limit}
            />
          )
        : null
    }
    clipsDot={false}
    onOpenClips={noop}
    density="compact"
    onDensityChange={noop}
    clipboardSharing={state === "mixed" ? true : null}
    onClipboardSharingChange={noop}
  />
  </>,
);
