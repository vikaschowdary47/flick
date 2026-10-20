import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? friendlyAuthError(error.message) : null;
  }, []);

  // Google via Supabase OAuth with PKCE, in the system browser sheet
  // (ASWebAuthenticationSession on iOS). Returns an error message or null.
  const signInWithGoogle = useCallback(async () => {
    try {
      // flick://auth/callback in a build, exp://<ip>:8081/--/auth/callback in Expo Go.
      const redirectTo = Linking.createURL("auth/callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return friendlyAuthError(error?.message ?? "No sign-in link");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success") return null; // closed the sheet

      const { queryParams } = Linking.parse(result.url);
      const code = typeof queryParams?.code === "string" ? queryParams.code : null;
      if (!code) {
        const description = queryParams?.error_description;
        return typeof description === "string" ? description : "Google sign-in didn't finish. Try again.";
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      return exchangeError ? friendlyAuthError(exchangeError.message) : null;
    } catch (err) {
      return friendlyAuthError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // TODO(apple-sign-in): add signInWithApple here once the Apple developer
  // account exists (expo-apple-authentication + supabase.auth.signInWithIdToken
  // with provider "apple"), and enable the Apple provider in Supabase.

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, loading, signIn, signInWithGoogle, signOut };
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email or password didn't match.";
  if (/network|fetch/i.test(message)) return "Can't reach Flick right now. Check your connection.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first, then try again.";
  return message;
}
