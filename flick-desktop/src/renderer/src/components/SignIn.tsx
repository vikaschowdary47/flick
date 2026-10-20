import type { FormEvent, RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import Header from "./Header";

interface SignInProps {
  accountMenuRef: RefObject<HTMLDivElement | null>;
  authError: string;
  authReady: boolean;
  email: string;
  handleDragEnter: (event: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLElement>) => void;
  handleSignIn: (event: FormEvent<HTMLFormElement>) => void;
  handleGoogleSignIn: () => void;
  handleSignOut: () => void;
  isAccountMenuOpen: boolean;
  isDraggingFiles: boolean;
  isOnline: boolean;
  isSigningIn: boolean;
  onOutsideClick: (event: React.MouseEvent<HTMLElement>) => void;
  password: string;
  session: Session | null;
  setEmail: (email: string) => void;
  setIsAccountMenuOpen: (isOpen: boolean | ((current: boolean) => boolean)) => void;
  setPassword: (password: string) => void;
  supabaseConfigured: boolean;
  arrivalPulse: number;
  showConfetti: boolean;
}

export default function SignIn({
  accountMenuRef,
  authError,
  authReady,
  email,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleSignIn,
  handleGoogleSignIn,
  handleSignOut,
  isAccountMenuOpen,
  isDraggingFiles,
  isOnline,
  isSigningIn,
  onOutsideClick,
  password,
  session,
  setEmail,
  setIsAccountMenuOpen,
  setPassword,
  supabaseConfigured,
  arrivalPulse,
  showConfetti,
}: SignInProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main
      className={`widget${isDraggingFiles ? " drag-active" : ""}`}
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
        setIsAccountMenuOpen={setIsAccountMenuOpen}
        session={session}
        arrivalPulse={arrivalPulse}
      />
      <section className="content content-auth" aria-labelledby="incoming-heading">
        {!authReady && (
          <p className="auth-status" role="status">
            Checking sign-in…
          </p>
        )}
        {authReady && !supabaseConfigured && (
          <p className="auth-status" role="status">
            Add your Supabase URL and publishable key to .env.local to sign in.
          </p>
        )}
        {authReady && supabaseConfigured && (
          <div className="sign-in-screen">
            <div className="sign-in-mark brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="M10 22 22 10M12 10h10v10" />
              </svg>
            </div>
            <p className="eyebrow">YOUR FILES, EVERYWHERE</p>
            <h1 id="incoming-heading">Welcome to Flick</h1>
            <p className="sign-in-copy">
              Sign in to catch files from your other devices.
            </p>
            <form className="auth-form" onSubmit={handleSignIn}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button
                className="sign-in-button"
                type="submit"
                disabled={isSigningIn}
              >
                {isSigningIn ? "Signing in…" : "Sign in"}
              </button>
              <p className="sign-in-or">or</p>
              <button
                className="sign-in-button sign-in-button-secondary"
                type="button"
                disabled={isSigningIn}
                onClick={handleGoogleSignIn}
              >
                Continue with Google
              </button>
              {/* TODO(apple-sign-in): "Continue with Apple" button goes here. */}
              {authError && (
                <p className="auth-error" role="alert">
                  {authError}
                </p>
              )}
            </form>
          </div>
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
