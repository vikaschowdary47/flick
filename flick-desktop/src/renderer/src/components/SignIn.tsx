import { useEffect, useLayoutEffect, useState, type FormEvent, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import type { Session } from "@supabase/supabase-js";
import { APPLE_SIGN_IN_ENABLED } from "../hooks/useAppleSignIn";
import Header from "./Header";
import type { AuthCallbackNotice } from "../hooks/useSession";
import { APP_NAME } from "../../../shared/appName";

interface SignInProps {
  accountMenuRef: RefObject<HTMLDivElement | null>;
  authError: string;
  setAuthError: (message: string) => void;
  authReady: boolean;
  email: string;
  handleDragEnter: (event: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLElement>) => void;
  handleSignIn: (event: FormEvent<HTMLFormElement>) => void;
  handleGoogleSignIn: () => void;
  handleAppleSignIn: () => void;
  cancelAppleSignIn: () => void;
  isAppleSigningIn: boolean;
  cancelGoogleSignIn: () => void;
  isGoogleSigningIn: boolean;
  handleSignUp: (email: string, password: string) => Promise<string | null>;
  handleResendSignUp: (email: string) => Promise<string | null>;
  handleRequestPasswordReset: (email: string) => Promise<string | null>;
  handleUpdatePassword: (password: string) => Promise<string | null>;
  passwordRecovery: boolean;
  authCallbackNotice: AuthCallbackNotice | null;
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
  setAuthError,
  authReady,
  email,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleSignIn,
  handleGoogleSignIn,
  handleAppleSignIn,
  cancelAppleSignIn,
  isAppleSigningIn,
  cancelGoogleSignIn,
  isGoogleSigningIn,
  handleSignUp,
  handleResendSignUp,
  handleRequestPasswordReset,
  handleUpdatePassword,
  passwordRecovery,
  authCallbackNotice,
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
  const [mode, setMode] = useState<"signIn" | "signUp" | "resetRequest" | "resetPassword" | "checkEmail">(
    passwordRecovery ? "resetPassword" : "signIn",
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!authError && !localError) return;
    const timer = window.setTimeout(() => {
      setLocalError("");
      setAuthError("");
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [authError, localError, setAuthError]);

  useEffect(() => {
    if (passwordRecovery) setMode("resetPassword");
  }, [passwordRecovery]);
  useEffect(() => {
    if (!authCallbackNotice) return;
    setEmail(authCallbackNotice.email);
    setPassword("");
    setConfirmPassword("");
    setLocalError("");
    setMode(authCallbackNotice.kind === "reset" ? "resetRequest" : "signIn");
  }, [authCallbackNotice, setEmail, setPassword]);
  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // SignIn is rendered instead of Widget while signed out, so it must report
  // its own minimum height to the tray/panel window.
  useLayoutEffect(() => {
    window.flick.reportPopoverHeight(520, false);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLocalError("");
    if (mode === "signIn") return handleSignIn(event);
    if (mode === "signUp") {
      if (!email.includes("@")) return setLocalError("Enter a valid email address.");
      if (password.length < 8) return setLocalError("Use a password with at least 8 characters.");
      if (password !== confirmPassword) return setLocalError("Passwords do not match.");
      const error = await handleSignUp(email, password);
      if (error) setLocalError(error);
      else { setMode("checkEmail"); setCooldown(60); }
    } else if (mode === "resetRequest") {
      if (!email.includes("@")) return setLocalError("Enter a valid email address.");
      const error = await handleRequestPasswordReset(email);
      if (error) setLocalError(error);
      else setMode("checkEmail");
    } else if (mode === "resetPassword") {
      if (password.length < 8) return setLocalError("Use a password with at least 8 characters.");
      if (password !== confirmPassword) return setLocalError("Passwords do not match.");
      const error = await handleUpdatePassword(password);
      if (error) setLocalError(error);
      else setMode("signIn");
    }
  }

  async function resend(): Promise<void> {
    if (cooldown > 0) return;
    const error = await handleResendSignUp(email);
    if (error) setLocalError(error);
    else setCooldown(60);
  }

  return (
    <main
      className={`widget widget-auth${isDraggingFiles ? " drag-active" : ""}`}
      onClickCapture={onOutsideClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="drop-overlay" aria-hidden="true">
          Drop files to upload to {APP_NAME}
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
      {(authError || localError) && (
        <div className="auth-error auth-error-top">
          <span role="alert">{localError || authError}</span>
          <button type="button" className="auth-error-dismiss" aria-label="Dismiss error" onClick={() => { setLocalError(""); setAuthError(""); }}>×</button>
        </div>
      )}
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
            <h1 id="incoming-heading">{mode === "signUp" ? `Join ${APP_NAME}` : mode === "resetPassword" ? "Choose a new password" : `Welcome to ${APP_NAME}`}</h1>
            <p className="sign-in-copy">
              {mode === "checkEmail" ? `Check ${email} for a link from ${APP_NAME}.` : "Sign in to catch files from your other devices."}
            </p>
            {authCallbackNotice && <p className="auth-status" role="alert">
              {authCallbackNotice.kind === "confirmed"
                ? "Email confirmed! Go back to the device where you signed up, or log in here."
                : "This reset link was opened on another device. Open it on the device where you requested it, or resend the link here."}
            </p>}
            <form className="auth-form" onSubmit={submit}>
              {mode !== "checkEmail" && mode !== "resetPassword" && <label>
                Email
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>}
              {(mode === "signIn" || mode === "signUp") && <label>
                Password
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>}
              {(mode === "signUp" || mode === "resetPassword") && <label>
                Confirm password
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </label>}
              {mode === "signIn" && <>
                <button className="sign-in-button" type="submit" disabled={isSigningIn}>{isSigningIn ? "Signing in…" : "Sign in"}</button>
                <button className="auth-link" type="button" onClick={() => { setMode("resetRequest"); setLocalError(""); }}>Forgot password?</button>
                <p className="sign-in-or">or</p>
                <button className="sign-in-button sign-in-button-secondary google-sign-in-button" type="button" disabled={isSigningIn} onClick={handleGoogleSignIn}>
                  <svg className="google-logo" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
                    <path fill="#34A853" d="M12 21.98c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.98Z" />
                    <path fill="#FBBC05" d="M6.53 14.06a5.86 5.86 0 0 1 0-3.72V7.81H3.28a9.76 9.76 0 0 0 0 8.78l3.25-2.53Z" />
                    <path fill="#EA4335" d="M12 6.31c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.43 14.63 2.02 12 2.02a9.75 9.75 0 0 0-8.72 5.79l3.25 2.53C7.3 8.03 9.46 6.31 12 6.31Z" />
                  </svg>
                  {isSigningIn ? "Signing in…" : "Continue with Google"}
                </button>
                {isGoogleSigningIn && (
                  <button className="auth-link" type="button" onClick={cancelGoogleSignIn}>Cancel Google sign-in</button>
                )}
                {APPLE_SIGN_IN_ENABLED && <button type="button" className="apple-sign-in-button" onClick={handleAppleSignIn} disabled={isSigningIn}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.05 12.54c.03 3.07 2.69 4.09 2.72 4.1-.02.07-.43 1.46-1.41 2.9-.85 1.24-1.73 2.48-3.12 2.5-1.36.03-1.8-.81-3.36-.81-1.55 0-2.04.79-3.33.84-1.34.05-2.35-1.35-3.2-2.58-1.75-2.53-3.09-7.15-1.29-10.27a4.97 4.97 0 0 1 4.22-2.56c1.32-.03 2.56.89 3.36.89.79 0 2.28-1.1 3.84-.94.65.03 2.48.26 3.65 1.97-.1.06-2.18 1.27-2.08 3.96ZM14.49 4.94c.71-.86 1.19-2.05 1.06-3.24-1.02.04-2.25.68-2.98 1.54-.66.76-1.24 1.98-1.09 3.14 1.14.09 2.3-.58 3.01-1.44Z" /></svg>
                  Sign in with Apple
                </button>}
                {isAppleSigningIn && <button className="auth-link" type="button" onClick={cancelAppleSignIn}>Cancel Apple sign-in</button>}
                <button className="auth-link" type="button" onClick={() => { setMode("signUp"); setLocalError(""); }}>Don’t have an account? Sign up</button>
              </>}
              {mode === "signUp" && <>
                <button className="sign-in-button" type="submit" disabled={isSigningIn}>{isSigningIn ? "Creating account…" : "Create account"}</button>
                <button className="auth-link" type="button" onClick={() => setMode("signIn")}>Already have an account? Log in</button>
              </>}
              {mode === "resetRequest" && <>
                <button className="sign-in-button" type="submit" disabled={isSigningIn}>{isSigningIn ? "Sending…" : "Send reset link"}</button>
                <button className="auth-link" type="button" onClick={() => setMode("signIn")}>Back to sign in</button>
              </>}
              {mode === "resetPassword" && <button className="sign-in-button" type="submit" disabled={isSigningIn}>{isSigningIn ? "Saving…" : "Save password"}</button>}
              {mode === "checkEmail" && <>
                <button className="sign-in-button" type="button" onClick={() => { setMode("signIn"); setPassword(""); setConfirmPassword(""); setLocalError(""); }} disabled={isSigningIn}>I’ve confirmed — log in</button>
                <button className="sign-in-button" type="button" onClick={() => void resend()} disabled={isSigningIn || cooldown > 0}>{cooldown ? `Resend in ${cooldown}s` : "Resend email"}</button>
                <button className="auth-link" type="button" onClick={() => setMode("signIn")}>Back to sign in</button>
              </>}
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
