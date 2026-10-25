import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

export const APPLE_SIGN_IN_ENABLED = import.meta.env.VITE_ENABLE_APPLE_SIGN_IN === "true";

export function useAppleSignIn(setError: (message: string) => void) {
  const inProgress = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function signIn(): Promise<void> {
    if (!supabase || !APPLE_SIGN_IN_ENABLED || inProgress.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    inProgress.current = true;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple", options: { redirectTo: "eqlshare://auth-callback", skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error("Couldn't start Apple sign-in.");
      if (controller.signal.aborted) throw new Error("Apple sign-in was cancelled.");
      const url = await new Promise<string>((resolve, reject) => {
        let done = false;
        let unsubscribe: () => void = () => {};
        const finish = (callback: () => void) => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          controller.signal.removeEventListener("abort", cancel);
          unsubscribe?.();
          callback();
        };
        const cancel = () => finish(() => reject(new Error("Apple sign-in was cancelled.")));
        const timeout = setTimeout(() => finish(() => reject(new Error("Apple sign-in timed out."))), 300_000);
        controller.signal.addEventListener("abort", cancel, { once: true });
        unsubscribe = window.flick.onAuthCallback((value) => finish(() => resolve(value)));
        if (done) unsubscribe();
        else void window.flick.openAuthUrl(data.url!).catch((reason: unknown) => finish(() => reject(reason)));
      });
      const callback = new URL(url);
      const params = new URLSearchParams(callback.hash.replace(/^#/, ""));
      callback.searchParams.forEach((value, key) => params.set(key, value));
      if (params.get("error") || params.get("error_code")) {
        if (/access_denied|cancel/i.test(`${params.get("error")} ${params.get("error_code")} ${params.get("error_description")}`)) {
          throw new Error("Apple sign-in was cancelled.");
        }
        throw new Error(params.get("error_description") ?? "Apple sign-in failed. Try again.");
      }
      const code = params.get("code");
      if (!code) throw new Error("Apple sign-in didn't finish. Try again.");
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't sign in with Apple.");
    } finally {
      abortRef.current = null;
      inProgress.current = false;
      setBusy(false);
    }
  }
  return { signIn, busy, inProgress, cancel: () => abortRef.current?.abort() };
}
