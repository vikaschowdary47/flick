"use client";
import { useEffect } from "react";

// Safety net: if Supabase falls back to the Site URL (homepage) after Google/Apple
// sign-in, forward the ?code= on to /auth/callback so it still reaches the app.
export function AuthCodeForwarder() {
  useEffect(() => {
    const { search, hash } = window.location;
    const params = new URLSearchParams(search);
    if (params.has("code") || params.has("error_description") || hash.includes("access_token")) {
      window.location.replace(`/auth/callback${search}${hash}`);
    }
  }, []);
  return null;
}
