import SignIn from "./components/SignIn";
import Widget from "./components/Widget";
import { useFiles } from "./hooks/useFiles";
import { useSession } from "./hooks/useSession";
import { supabase } from "./supabase";

export default function App() {
  const auth = useSession();
  const fileState = useFiles(auth.session);

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
    />
  );
}
