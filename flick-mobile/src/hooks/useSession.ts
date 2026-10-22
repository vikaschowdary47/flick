import { useCallback, useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { makeRedirectUri } from "expo-auth-session";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { widgetsBridge } from "../../modules/flick-widgets";
import { clearCache } from "../lib/cache";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export const APPLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === "true";
const exchangedCodes = new Set<string>();

export type AuthCallbackNotice = {
  kind: "confirmed" | "reset";
  email: string;
};

function authRedirectUrl(email?: string): string {
  const redirect = makeRedirectUri({ scheme: "flick", path: "auth-callback" });
  if (!email) return redirect;
  const url = new URL(redirect);
  url.searchParams.set("email", email.trim());
  return url.toString();
}

function callbackParams(url: string): URLSearchParams {
  const parsed = Linking.parse(url);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.queryParams ?? {})) {
    if (typeof value === "string") params.set(key, value);
  }
  if (parsed.path?.includes("#")) {
    for (const [key, value] of new URLSearchParams(parsed.path.split("#")[1]).entries()) {
      params.set(key, value);
    }
  }
  return params;
}

async function exchangeCallbackCode(code: string): Promise<string | null> {
  if (exchangedCodes.has(code)) return null;
  exchangedCodes.add(code);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) exchangedCodes.delete(code);
  return error ? friendlyAuthError(error.message) : null;
}

function isCodeVerifierError(message: string): boolean {
  return /code verifier|verifier.*(missing|not found|invalid)|pkce/i.test(message);
}

async function openGoogleAuthSession(url: string, redirectTo: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      WebBrowser.openAuthSessionAsync(url, redirectTo),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Google sign-in timed out.")), 120_000);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authCallbackNotice, setAuthCallbackNotice] = useState<AuthCallbackNotice | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (_event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });

    async function handleAuthUrl(url: string): Promise<void> {
      const params = callbackParams(url);
      const code = params.get("code");
      if (code) {
        const error = await exchangeCallbackCode(code);
        if (error && isCodeVerifierError(error)) {
          setAuthCallbackNotice({
            kind: params.get("type") === "recovery" ? "reset" : "confirmed",
            email: params.get("email") ?? "",
          });
          return;
        }
        if (error) console.warn("Flick email confirmation failed:", error);
      }
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error && isCodeVerifierError(error.message)) {
          setAuthCallbackNotice({ kind: "reset", email: params.get("email") ?? "" });
          return;
        }
        if (error) console.warn("Flick password reset session failed:", error.message);
        if (params.get("type") === "recovery") setPasswordRecovery(true);
      }
    }

    void Linking.getInitialURL().then((url) => {
      if (url) void handleAuthUrl(url);
    });
    const urlListener = Linking.addEventListener("url", ({ url }) => void handleAuthUrl(url));

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      urlListener.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? friendlyAuthError(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirectUrl(email) },
    });
    return error ? friendlyAuthError(error.message) : null;
  }, []);

  const resendSignUp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl(email) },
    });
    return error ? friendlyAuthError(error.message) : null;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl(email) });
    return error ? friendlyAuthError(error.message) : null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setPasswordRecovery(false);
    return error ? friendlyAuthError(error.message) : null;
  }, []);

  // Google via Supabase OAuth with PKCE, in the system browser sheet
  // (ASWebAuthenticationSession on iOS). Returns an error message or null.
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectTo = authRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return friendlyAuthError(error?.message ?? "No sign-in link");

      const result = await openGoogleAuthSession(data.url, redirectTo);
      if (result.type !== "success" || !result.url) return "Google sign-in was cancelled.";

      const { queryParams } = Linking.parse(result.url);
      const code = typeof queryParams?.code === "string" ? queryParams.code : null;
      if (!code) {
        const description = queryParams?.error_description;
        return typeof description === "string" ? description : "Google sign-in didn't finish. Try again.";
      }
      return exchangeCallbackCode(code);
    } catch (err) {
      return friendlyAuthError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!APPLE_SIGN_IN_ENABLED) return "Apple sign-in is not enabled yet.";
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
        { encoding: Crypto.CryptoEncoding.HEX },
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) return "Apple sign-in did not return an identity token.";
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      });
      return error ? friendlyAuthError(error.message) : null;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ERR_REQUEST_CANCELED") {
        return "Apple sign-in was cancelled.";
      }
      return friendlyAuthError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    clearCache(); // no downloaded copies stay behind after sign-out
    void widgetsBridge.clear(); // widgets don't keep showing this account
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    loading,
    passwordRecovery,
    authCallbackNotice,
    signIn,
    signUp,
    resendSignUp,
    requestPasswordReset,
    updatePassword,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email or password didn't match.";
  if (/network|fetch/i.test(message)) return "Can't reach Flick right now. Check your connection.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first, then try again.";
  if (/cancel|dismiss|closed|access_denied/i.test(message)) return "Sign-in was cancelled.";
  return message;
}
