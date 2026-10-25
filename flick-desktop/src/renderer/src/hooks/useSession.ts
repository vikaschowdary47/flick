import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useAppleSignIn } from "./useAppleSignIn";
import { supabase } from "../supabase";
import { APP_NAME } from "../../../shared/appName";

export type AuthCallbackNotice = {
  kind: "confirmed" | "reset";
  email: string;
};

function authRedirectUrl(email?: string): string {
  const redirect = new URL("flick://auth-callback");
  if (email) redirect.searchParams.set("email", email.trim());
  return redirect.toString();
}

function isCodeVerifierError(message: string): boolean {
  return /code verifier|verifier.*(missing|not found|invalid)|pkce/i.test(message);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const deletingAccount = useRef(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authCallbackNotice, setAuthCallbackNotice] = useState<AuthCallbackNotice | null>(null);
  const apple = useAppleSignIn(setAuthError);
  const appleInProgress = apple.inProgress;
  const googleInProgress = useRef(false);
  const googleAbort = useRef<AbortController | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function closeAccountMenu(event: Event): void {
      const accountMenu = accountMenuRef.current;
      if (
        accountMenu &&
        (!(event.target instanceof Node) || !accountMenu.contains(event.target))
      ) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleAccountMenuKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeAccountMenu, true);
    window.addEventListener("mousedown", closeAccountMenu, true);
    window.addEventListener("click", closeAccountMenu, true);
    document.addEventListener("keydown", handleAccountMenuKeyDown);
    return () => {
      window.removeEventListener("pointerdown", closeAccountMenu, true);
      window.removeEventListener("mousedown", closeAccountMenu, true);
      window.removeEventListener("click", closeAccountMenu, true);
      document.removeEventListener("keydown", handleAccountMenuKeyDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    const client = supabase;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void window.flick.setAccountActive(Boolean(nextSession) && !deletingAccount.current);
      setAuthReady(true);
      setAuthError("");
      if (_event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    const unsubscribe = window.flick.onAuthCallback((callbackUrl) => {
      if (googleInProgress.current || appleInProgress.current) return;
      void (async () => {
        try {
          const callback = new URL(callbackUrl);
          const params = new URLSearchParams(callback.hash.replace(/^#/, "&"));
          callback.searchParams.forEach((value, key) => params.set(key, value));
          const code = params.get("code");
          if (code) {
            const { error } = await client.auth.exchangeCodeForSession(code);
            if (error) {
              if (isCodeVerifierError(error.message)) {
                setAuthCallbackNotice({
                  kind: params.get("type") === "recovery" ? "reset" : "confirmed",
                  email: params.get("email") ?? "",
                });
                return;
              }
              throw error;
            }
          }
          if (params.get("access_token") && params.get("refresh_token")) {
            const { error } = await client.auth.setSession({
              access_token: params.get("access_token")!,
              refresh_token: params.get("refresh_token")!,
            });
            if (error) {
              if (isCodeVerifierError(error.message)) {
                setAuthCallbackNotice({ kind: "reset", email: params.get("email") ?? "" });
                return;
              }
              throw error;
            }
            setPasswordRecovery(params.get("type") === "recovery");
          }
        } catch (error: unknown) {
          setAuthError(friendlyAuthError(error instanceof Error ? error.message : String(error)));
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe();
    };
  }, [appleInProgress]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setIsSigningIn(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
      }
    } catch (error: unknown) {
      console.error(`Could not sign in to ${APP_NAME}:`, error);
      setAuthError(
        error instanceof Error ? error.message : `Could not sign in to ${APP_NAME}.`,
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  // Google via Supabase OAuth with PKCE: the system browser signs in and
  // returns to the already-running app through flick://auth-callback.
  async function handleGoogleSignIn(): Promise<void> {
    if (!supabase || googleInProgress.current) {
      return;
    }
    setIsSigningIn(true);
    setAuthError("");
    googleInProgress.current = true;
    const controller = new AbortController();
    googleAbort.current = controller;
    setIsGoogleSigningIn(true);
    try {
      const redirectTo = "flick://auth-callback";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        throw error ?? new Error("Could not start Google sign-in.");
      }
      if (controller.signal.aborted) throw new Error("Google sign-in was cancelled.");
      const callbackUrl = await new Promise<string>((resolve, reject) => {
        let finished = false;
        let unsubscribe: (() => void) | null = null;
        const timeout = window.setTimeout(() => {
          finish(() => reject(new Error("Google sign-in timed out.")));
        }, 5 * 60 * 1000);
        const finish = (callback: () => void) => {
          if (finished) return;
          finished = true;
          window.clearTimeout(timeout);
          controller.signal.removeEventListener("abort", cancel);
          unsubscribe?.();
          callback();
        };
        const cancel = () => finish(() => reject(new Error("Google sign-in was cancelled.")));
        controller.signal.addEventListener("abort", cancel, { once: true });
        unsubscribe = window.flick.onAuthCallback((url) => {
          finish(() => resolve(url));
        });
        if (finished) unsubscribe();
        if (!finished) {
          void window.flick.openAuthUrl(data.url!).catch((error: unknown) => {
            finish(() => reject(error));
          });
        }
      });
      const callback = new URL(callbackUrl);
      const params = new URLSearchParams(callback.hash.replace(/^#/, ""));
      callback.searchParams.forEach((value, key) => params.set(key, value));
      if (params.get("error") === "access_denied" || params.get("error_code") === "access_denied") {
        throw new Error("Google sign-in was cancelled.");
      }
      const callbackError = params.get("error_description") ?? params.get("error");
      if (callbackError) {
        throw new Error(callbackError);
      }
      const code = params.get("code");
      if (!code) {
        throw new Error("Google sign-in didn't finish. Try again.");
      }
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw exchangeError;
      }
    } catch (error: unknown) {
      console.error("Could not sign in with Google:", error);
      setAuthError(
        error instanceof Error ? friendlyAuthError(error.message) : "Could not sign in with Google.",
      );
    } finally {
      googleInProgress.current = false;
      googleAbort.current = null;
      setIsGoogleSigningIn(false);
      setIsSigningIn(false);
    }
  }

  async function handleSignUp(nextEmail: string, nextPassword: string): Promise<string | null> {
    if (!supabase) return `${APP_NAME} is not connected.`;
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: nextEmail.trim(),
        password: nextPassword,
        options: { emailRedirectTo: authRedirectUrl(nextEmail) },
      });
      if (error) return friendlyAuthError(error.message);
      // Confirmed accounts can return an obfuscated user instead of an error.
      if (data.user?.identities?.length === 0) {
        return "This email already has an account. Sign in or reset your password.";
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleResendSignUp(nextEmail: string): Promise<string | null> {
    if (!supabase) return `${APP_NAME} is not connected.`;
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: nextEmail.trim(),
        options: { emailRedirectTo: authRedirectUrl(nextEmail) },
      });
      return error ? friendlyAuthError(error.message) : null;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleRequestPasswordReset(nextEmail: string): Promise<string | null> {
    if (!supabase) return `${APP_NAME} is not connected.`;
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(nextEmail.trim(), {
        redirectTo: authRedirectUrl(nextEmail),
      });
      if (error?.code === "email_address_invalid") {
        return "The email service rejected this address, so we couldn't send a password reset link. This doesn't mean your account is missing. Contact support if this is your email.";
      }
      if (error?.code === "email_address_not_authorized") {
        return "Password reset emails aren't enabled for this address yet. Contact support to resolve the email service configuration.";
      }
      return error ? friendlyAuthError(error.message) : null;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleUpdatePassword(nextPassword: string): Promise<string | null> {
    if (!supabase) return `${APP_NAME} is not connected.`;
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (!error) setPasswordRecovery(false);
      return error ? friendlyAuthError(error.message) : null;
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleDeleteAccount(): Promise<string | null> {
    if (!supabase || !session) return "Sign in again before deleting your account.";
    if (deletingAccount.current) return "Account deletion is already running.";
    deletingAccount.current = true;
    setIsDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation: "DELETE", appleRefreshToken: session.provider_refresh_token ?? undefined },
      });
      if (error || !data?.deleted) return "Couldn't finish deleting your account. Check your connection and retry; uploads may be paused until cleanup finishes.";
      let cleanupFailed = false;
      try { await window.flick.clearAccountData(); } catch { cleanupFailed = true; }
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setEmail(""); setPassword(""); setPasswordRecovery(false); setAuthCallbackNotice(null);
      const notice = [`Your ${APP_NAME} account and cloud data have been deleted.`,
        data.appleRevocationRequired ? `Also revoke ${APP_NAME} in Apple Account → Sign-In & Security → Sign in with Apple → ${APP_NAME} → Stop Using Sign in with Apple.` : "",
        cleanupFailed ? `Some downloaded files could not be removed. Clear ${APP_NAME}'s local downloads before sharing this device.` : ""].filter(Boolean).join("\n\n");
      window.alert(notice);
      return null;
    } catch { return "Couldn't delete your account. Check your connection and retry."; }
    finally { deletingAccount.current = false; setIsDeletingAccount(false); }
  }

  async function handleSignOut(): Promise<void> {
    setIsAccountMenuOpen(false);
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error(`Could not sign out of ${APP_NAME}:`, error);
        setAuthError(error.message);
      }
    } catch (error: unknown) {
      console.error(`Could not sign out of ${APP_NAME}:`, error);
      setAuthError(
        error instanceof Error ? error.message : `Could not sign out of ${APP_NAME}.`,
      );
    }
  }

  function handleOutsideClick(event: MouseEvent<HTMLElement>): void {
    const accountMenu = accountMenuRef.current;
    if (
      isAccountMenuOpen &&
      accountMenu &&
      (!(event.target instanceof Node) || !accountMenu.contains(event.target))
    ) {
      setIsAccountMenuOpen(false);
    }
  }

  return {
    accountMenuRef,
    authError,
    setAuthError,
    authReady,
    email,
    handleGoogleSignIn,
    handleAppleSignIn: apple.signIn,
    cancelAppleSignIn: apple.cancel,
    isAppleSigningIn: apple.busy,
    cancelGoogleSignIn: () => googleAbort.current?.abort(),
    isGoogleSigningIn,
    handleSignIn,
    handleSignOut,
    handleDeleteAccount,
    isDeletingAccount,
    handleOutsideClick,
    isAccountMenuOpen,
    isOnline,
    isSigningIn,
    passwordRecovery,
    authCallbackNotice,
    handleSignUp,
    handleResendSignUp,
    handleRequestPasswordReset,
    handleUpdatePassword,
    password,
    session,
    setEmail,
    setIsAccountMenuOpen,
    setPassword,
  };
}

function friendlyAuthError(message: string): string {
  if (/cancel|dismiss|closed|access_denied/i.test(message)) return "Google sign-in was cancelled.";
  if (/network|fetch/i.test(message)) return `Can't reach ${APP_NAME} right now. Check your connection.`;
  return message || "Could not sign in with Google.";
}
