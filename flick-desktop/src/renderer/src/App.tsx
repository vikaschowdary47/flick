import FirstRunProfile from "./components/FirstRunProfile";
import { useOnboarding } from "./hooks/useOnboarding";
import SignIn from "./components/SignIn";
import ClipsPanel from "./components/ClipsPanel";
import LimitScreen from "./components/LimitScreen";
import Widget from "./components/Widget";
import { useEffect, useState } from "react";
import { useClips } from "./hooks/useClips";
import { useClipboardSetting } from "./hooks/useClipboardSetting";
import { useDensity } from "./hooks/useDensity";
import { useDevice } from "./hooks/useDevice";
import { useFeatureFlags } from "./hooks/useFeatureFlags";
import { useFiles } from "./hooks/useFiles";
import { useUsage } from "./hooks/useUsage";
import { useSession } from "./hooks/useSession";
import { useShareLinks } from "./hooks/useShareLinks";
import { supabase } from "./supabase";

export default function App() {
  const auth = useSession();
  const onboarding = useOnboarding(auth.session);
  const homeSession = onboarding.ready && !auth.passwordRecovery ? auth.session : null;
  const device = useDevice(homeSession, () => void auth.handleSignOut());
  const fileState = useFiles(homeSession, device.deviceId);
  const shareLinks = useShareLinks(homeSession);
  const activeLimit = shareLinks.limitHit ? "sharing" : fileState.limitHit ?? (device.limitHit ? "devices" : null);
  // Limits and usage come from the server; refresh when they're about to show.
  const { density, setDensity } = useDensity(homeSession);
  // Always loaded (cheap), refreshed as files change, for the 80% prompt.
  const usage = useUsage(Boolean(homeSession), fileState.files.reduce((sum, file) => sum + file.size, 0));
  // Clips: nothing is fetched, subscribed or bound unless the clipboard
  // feature flag and the user's Clipboard sharing setting are both on.
  const flags = useFeatureFlags(homeSession);
  const clipboardSetting = useClipboardSetting(homeSession, flags.clipboard);
  const clips = useClips(homeSession, device.deviceId, clipboardSetting.clipsActive);
  const [sendStatus, setSendStatus] = useState("");
  const sendClip = clips.send;
  useEffect(() => {
    if (!clipboardSetting.clipsActive) {
      return;
    }
    // Option/Alt+Shift+C or the tray menu: main read the clipboard on request.
    return window.flick.onSendClipboardText((text) => {
      if (!text.trim()) {
        setSendStatus("Your clipboard is empty.");
        return;
      }
      void sendClip(text).then((error) => setSendStatus(error ?? "Sent to your devices."));
    });
  }, [clipboardSetting.clipsActive, sendClip]);

  if (!auth.session || auth.passwordRecovery) {
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
        handleSignUp={auth.handleSignUp}
        handleResendSignUp={auth.handleResendSignUp}
        handleRequestPasswordReset={auth.handleRequestPasswordReset}
        handleUpdatePassword={auth.handleUpdatePassword}
        passwordRecovery={auth.passwordRecovery}
        authCallbackNotice={auth.authCallbackNotice}
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

  if (!onboarding.ready) {
    return <FirstRunProfile key={auth.session.user.id} initialName={onboarding.initialName} initialType={onboarding.initialType}
      loading={onboarding.loading} error={onboarding.error} onRetry={onboarding.retry} onSave={onboarding.save}
      onSignOut={auth.handleSignOut} />;
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
      onShareLink={shareLinks.create}
      onRevokeShareLink={shareLinks.revoke}
      hasShareLink={shareLinks.hasShareLink}
      onTogglePin={fileState.togglePin}
      onRetryDownload={fileState.retryDownload}
      onUndoRemove={fileState.undoRemove}
      setIsAccountMenuOpen={auth.setIsAccountMenuOpen}
      session={auth.session}
      showConfetti={fileState.showConfetti}
      arrivalPulse={fileState.arrivalPulse}
      uploadError={fileState.uploadError}
      shareStatus={shareLinks.status}
      loadError={fileState.loadError}
      onRetryLoad={fileState.retryLoad}
      usage={usage.usage}
      clipsCount={clips.clips.length}
      clipsPanel={
        clipboardSetting.clipsActive ? (view) => (
          <ClipsPanel
            clips={clips.clips}
            error={clips.error}
            deviceId={device.deviceId}
            deviceNames={device.deviceNames}
            onSend={clips.send}
            onDelete={(id) => void clips.remove(id)}
            sendStatus={sendStatus}
            density={view.popover ? "compact" : density}
            popover={view.popover}
            limit={view.limit}
          />
        ) : null
      }
      clipsDot={clips.hasNew}
      density={density}
      onDensityChange={setDensity}
      onOpenClips={clips.clearNew}
      clipboardSharing={flags.clipboard ? clipboardSetting.sharingOn : null}
      onClipboardSharingChange={clipboardSetting.setSharing}
    />
    <LimitScreen
      limit={activeLimit}
      usage={usage.usage}
      email={auth.session.user.email ?? null}
      devices={device.devices}
      thisDeviceId={device.deviceId}
      onRemoveDevice={device.removeDevice}
      paymentsEnabled={flags.payments}
      onClose={() => {
        fileState.clearLimit();
        shareLinks.clearLimit();
        device.clearLimit();
      }}
    />
    </>
  );
}
