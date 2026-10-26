import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export type AccountType = "personal" | "business";
type Profile = { user_id: string; display_name: string | null; account_type: AccountType | null; onboarded_at: string | null };

// The first-run "display name + personal/business" step. Neither answer is used
// anywhere yet, so it's off: ask later, when sharing with other people or teams
// needs a name. Flip to true to bring the screen back (the code is unchanged).
export const ASK_PROFILE_ON_SIGNUP = false;

export function useOnboarding(session: Session | null) {
  const userId = session?.user.id;
  const [state, setState] = useState<{ userId?: string; profile: Profile | null; error: string }>({ profile: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!ASK_PROFILE_ON_SIGNUP || !userId || !supabase) { setState({ profile: null, error: "" }); return; }
    let active = true;
    const client = supabase;
    setState({ userId, profile: null, error: "" });
    void (async () => {
      try {
        const { data, error } = await client.rpc("ensure_my_profile").single<Profile>();
        if (error) throw error;
        if (!data || data.user_id !== userId) throw new Error("Profile unavailable");
        if (active) setState({ userId, profile: data as Profile, error: "" });
      } catch {
        if (active) setState({ userId, profile: null, error: "Couldn't load your profile. Check your connection and retry." });
      }
    })();
    return () => { active = false; };
  }, [userId, attempt]);

  const save = useCallback(async (displayName: string, accountType: AccountType): Promise<string | null> => {
    const name = displayName.trim();
    if (!name || name.length > 80) return "Enter a name between 1 and 80 characters.";
    if (!supabase || !userId) return "Sign in again to continue.";
    try {
      const { data, error } = await supabase.from("profiles")
        .update({ display_name: name, account_type: accountType, onboarded_at: new Date().toISOString() })
        .eq("user_id", userId).select("user_id,display_name,account_type,onboarded_at").single();
      if (error) throw error;
      setState({ userId, profile: data as Profile, error: "" });
      return null;
    } catch { return "Couldn't save your profile. Check your connection and try again."; }
  }, [userId]);
  const profile = state.userId === userId ? state.profile : null;
  const metadata = session?.user.user_metadata;
  const providerName = [metadata?.full_name, metadata?.name].find((value) => typeof value === "string" && value.trim());
  return {
    ready: !ASK_PROFILE_ON_SIGNUP || Boolean(profile?.onboarded_at),
    loading: ASK_PROFILE_ON_SIGNUP && Boolean(userId && (!profile && !(state.userId === userId && state.error))),
    error: state.userId === userId ? state.error : "",
    initialName: profile?.display_name ?? providerName ?? "",
    initialType: profile?.account_type ?? "personal" as AccountType,
    retry: () => setAttempt((value) => value + 1),
    save,
  };
}
