import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      setAuthError("");
    });

    return () => subscription.unsubscribe();
  }, []);

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
      console.error("Could not sign in to Flick:", error);
      setAuthError(
        error instanceof Error ? error.message : "Could not sign in to Flick.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  // Google via Supabase OAuth with PKCE: the system browser signs in and
  // redirects to a loopback listener in the main process with ?code=….
  async function handleGoogleSignIn(): Promise<void> {
    if (!supabase) {
      return;
    }
    setIsSigningIn(true);
    setAuthError("");
    try {
      const redirectTo = await window.flick.startAuthLoopback();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        throw error ?? new Error("Could not start Google sign-in.");
      }
      const code = await window.flick.waitForAuthCode(data.url);
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw exchangeError;
      }
    } catch (error: unknown) {
      console.error("Could not sign in with Google:", error);
      setAuthError(
        error instanceof Error ? error.message : "Could not sign in with Google.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  // TODO(apple-sign-in): add handleAppleSignIn once the Apple developer account
  // exists (provider "apple" through the same loopback flow), and enable the
  // Apple provider in Supabase.

  async function handleSignOut(): Promise<void> {
    setIsAccountMenuOpen(false);
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Could not sign out of Flick:", error);
        setAuthError(error.message);
      }
    } catch (error: unknown) {
      console.error("Could not sign out of Flick:", error);
      setAuthError(
        error instanceof Error ? error.message : "Could not sign out of Flick.",
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
    authReady,
    email,
    handleGoogleSignIn,
    handleSignIn,
    handleSignOut,
    handleOutsideClick,
    isAccountMenuOpen,
    isOnline,
    isSigningIn,
    password,
    session,
    setEmail,
    setIsAccountMenuOpen,
    setPassword,
  };
}
