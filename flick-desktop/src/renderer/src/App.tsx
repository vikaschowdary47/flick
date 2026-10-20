import SignIn from "./components/SignIn";
import LimitScreen from "./components/LimitScreen";
import Widget from "./components/Widget";
import { useDevice } from "./hooks/useDevice";
import { useFiles } from "./hooks/useFiles";
import { useUsage } from "./hooks/useUsage";
import { useSession } from "./hooks/useSession";
import { supabase } from "./supabase";

export default function App() {
  const auth = useSession();
  const device = useDevice(auth.session, () => void auth.handleSignOut());
  const fileState = useFiles(auth.session, device.deviceId);
  const activeLimit = fileState.limitHit ?? (device.limitHit ? "devices" : null);
  // Limits and usage come from the server; refresh when they're about to show.
  const usage = useUsage(auth.isAccountMenuOpen || activeLimit !== null);

  if (!auth.session) {
    return (
      <SignIn
        accountMenuRef={auth.accountMenuRef}
        authError={auth.authError}
        authReady={auth.authReady}
        email={auth.email}
        handleDragEnter={fileState.handleDragEnter}
        handleDragLeave={fileState.handleDragLeave}
        handleDragOver={fileState.handleDragOver}
        handleDrop={fileState.handleDrop}
        handleSignIn={auth.handleSignIn}
        handleGoogleSignIn={auth.handleGoogleSignIn}
        handleSignOut={auth.handleSignOut}
        isAccountMenuOpen={auth.isAccountMenuOpen}
        isDraggingFiles={fileState.isDraggingFiles}
        isOnline={auth.isOnline}
        isSigningIn={auth.isSigningIn}
        onOutsideClick={auth.handleOutsideClick}
        password={auth.password}
        session={auth.session}
        setEmail={auth.setEmail}
        setIsAccountMenuOpen={auth.setIsAccountMenuOpen}
        setPassword={auth.setPassword}
        supabaseConfigured={Boolean(supabase)}
        arrivalPulse={fileState.arrivalPulse}
        showConfetti={fileState.showConfetti}
      />
    );
  }

  return (
    <>
    <Widget
      accountMenuRef={auth.accountMenuRef}
      authReady={auth.authReady}
      fileInputRef={fileState.fileInputRef}
      files={fileState.files}
      handleDragEnter={fileState.handleDragEnter}
      handleDragLeave={fileState.handleDragLeave}
      handleDragOver={fileState.handleDragOver}
      handleDrop={fileState.handleDrop}
      handleFileSelection={fileState.handleFileSelection}
      handleSignOut={auth.handleSignOut}
      isAccountMenuOpen={auth.isAccountMenuOpen}
      isDraggingFiles={fileState.isDraggingFiles}
      isLoadingFiles={fileState.isLoadingFiles}
      isOnline={auth.isOnline}
      isUploading={fileState.isUploading}
      pendingRemovals={fileState.pendingRemovals}
      deviceId={device.deviceId}
      deviceName={device.deviceName}
      deviceNames={device.deviceNames}
      onRenameDevice={device.renameDevice}
      onOutsideClick={auth.handleOutsideClick}
      onPreviewFile={fileState.previewFile}
      onStartFileDrag={fileState.startFileDrag}
      onRemoveFile={fileState.removeFromWidget}
      onTogglePin={fileState.togglePin}
      onRetryDownload={fileState.retryDownload}
      onUndoRemove={fileState.undoRemove}
      setIsAccountMenuOpen={auth.setIsAccountMenuOpen}
      session={auth.session}
      showConfetti={fileState.showConfetti}
      arrivalPulse={fileState.arrivalPulse}
      uploadError={fileState.uploadError}
      usage={usage.usage}
    />
    <LimitScreen
      limit={activeLimit}
      usage={usage.usage}
      email={auth.session.user.email ?? null}
      devices={device.devices}
      thisDeviceId={device.deviceId}
      onRemoveDevice={device.removeDevice}
      onClose={() => {
        fileState.clearLimit();
        device.clearLimit();
      }}
    />
    </>
  );
}
