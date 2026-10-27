// Dev-only preview of the widget in one state, for checking layouts and
// taking screenshots without a signed-in account. Not used by the app.
import { createRef } from "react";
import ReactDOM from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import "@fontsource/hanken-grotesk/400.css"
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import { designTokenCssVariables } from "../../design/tokens";
import ClipsPanel from "./components/ClipsPanel";
import LimitScreen from "./components/LimitScreen";
import SignIn from "./components/SignIn";
import Widget from "./components/Widget";
import type { ClipRow } from "./clips";
import type { CloudFile } from "./types";
import "./styles.css";
import "./popover-v2.css";

// Tokens go in a zero-specificity rule at the top of <head>, so the
// stylesheet's dark-mode block can override them (inline styles couldn't).
const tokenStyle = document.createElement("style");
tokenStyle.textContent = `:where(:root){${Object.entries(designTokenCssVariables)
  .map(([name, value]) => `${name}:${value};`)
  .join("")}}`;
document.head.prepend(tokenStyle);

const params = new URLSearchParams(location.search);
const state = params.get("state") ?? "files";
// state=signin: the signed-out screen.
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

// state=v2: the files in the v2 mockup (thumbnails come from the preview server).
const v2 = (n: number, name: string, mime: string, hoursLeft: number, extra: Partial<CloudFile> = {}): CloudFile => ({
  ...file(n, name, mime, 24 - hoursLeft),
  size: [2_100_000, 380_000, 96_000, 1_400_000, 48_000_000, 68_000_000][n % 6],
  device_id: n % 2 ? "redmi" : "phone",
  ...extra,
});
const v2Files: CloudFile[] = [
  v2(0, "lake-sunset.jpg", "image/jpeg", 23.99, { thumb_path: "photo.jpg", created_at: new Date(now - 30_000).toISOString() }),
  v2(1, "floor-plan.png", "image/png", 16.5, { thumb_path: "plan.jpg" }),
  v2(2, "brand-palette.png", "image/png", 9.5, { thumb_path: "palette.jpg" }),
  v2(3, "Invoice-2026-1043.pdf", "application/pdf", 21.5, { thumb_path: "invoice.jpg" }),
  v2(4, "design-assets.zip", "application/zip", 22, { downloadState: "downloading", localFileId: undefined }),
  v2(5, "demo-recording.mov", "video/quicktime", 20, { downloadState: "error", localFileId: undefined }),
];
const v2Extra: CloudFile[] = [
  ...v2Files.slice(0, 3),
  v2(6, "harbor-dusk.jpg", "image/jpeg", 12, { thumb_path: "dusk.jpg" }),
  v2(7, "desk-wallpaper.jpg", "image/jpeg", 6, { thumb_path: "wall.jpg" }),
  ...v2Files.slice(3),
];

const mixed: CloudFile[] = Array.from({ length: fileCount }, (_, i) =>
  file(i, `document-${i + 1}.pdf`, "application/pdf", i * 1.3),
);
const clipTexts = params.get("state")?.startsWith("v2") ? [
  "rm -rf dist/mac-* && npm run package:mac",
  "https://github.com/anthropics/skills",
  "Wi-Fi for the studio is Flicker_5G, password is on the fridge",
] : [
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
  ...(params.get("state")?.startsWith("v2") ? { device_id: ["mac", "phone", "redmi"][i % 3], created_at: new Date(now - [2, 5, 26][i % 3] * 3_600_000).toISOString() } : {}),
}));

const noop = () => {};
const session = { user: { id: "preview", email: "you@example.com" } } as unknown as Session;

const signInPreview = (
  <SignIn
    accountMenuRef={createRef<HTMLDivElement>()}
    authError=""
    setAuthError={noop}
    authReady
    email=""
    handleDragEnter={noop}
    handleDragLeave={noop}
    handleDragOver={noop}
    handleDrop={noop}
    handleSignIn={(event) => event.preventDefault()}
    handleGoogleSignIn={noop}
    handleAppleSignIn={noop}
    cancelAppleSignIn={noop}
    isAppleSigningIn={false}
    cancelGoogleSignIn={noop}
    isGoogleSigningIn={false}
    handleSignUp={async () => null}
    handleResendSignUp={async () => null}
    handleRequestPasswordReset={async () => null}
    handleUpdatePassword={async () => null}
    passwordRecovery={false}
    authCallbackNotice={null}
    handleSignOut={noop}
    isAccountMenuOpen={false}
    isDraggingFiles={false}
    isOnline
    isSigningIn={false}
    onOutsideClick={noop}
    password=""
    session={null}
    setEmail={noop}
    setIsAccountMenuOpen={noop}
    setPassword={noop}
    supabaseConfigured
    arrivalPulse={0}
    showConfetti={false}
  />
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  state === "signin" ? signInPreview : <>
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
    files={state === "v2" ? (params.has("more") ? v2Extra : v2Files) : state === "files" ? sample : state === "many" ? many : state === "mixed" ? mixed : []}
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
    deviceId={state === "v2" || state === "v2clips" || state === "empty" ? "mac" : null}
    deviceName="Vikas's MacBook"
    deviceNames={state === "v2" || state === "v2clips" || state === "empty" ? { mac: "Vikas's MacBook", phone: "iPhone", redmi: "Redmi" } : {}}
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
    onShareLink={noop}
    onRevokeShareLink={noop}
    hasShareLink={() => false}
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
    shareStatus=""
    loadError={
      state === "error"
        ? "Could not load your files. (permission denied for table files · code 42501)"
        : ""
    }
    onRetryLoad={noop}
    clipsCount={sampleClips.length}
    clipsPanel={
      state === "mixed" || state === "v2" || state === "v2clips"
        ? (view) => (
            <ClipsPanel
              clips={sampleClips}
              error=""
              deviceId="mac"
              deviceNames={state.startsWith("v2") ? { mac: "Vikas's MacBook", phone: "iPhone", redmi: "Redmi" } : { phone: "Vikas's iPhone" }}
              onSend={async () => null}
              onDelete={noop}
              sendStatus=""
              density="compact"
              popover={view.popover}
              limit={view.limit}
              onShowMore={view.onShowMore}
            />
          )
        : null
    }
    clipsDot={false}
    onOpenClips={noop}
    density="compact"
    onDensityChange={noop}
    clipboardSharing={state === "mixed" || state.startsWith("v2") ? true : null}
    onClipboardSharingChange={noop}
  />
  </>,
);
