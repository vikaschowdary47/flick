import { useState } from "react";
import type { LimitKind } from "../limits";
import { supabase } from "../supabase";

export type WaitlistState = "idle" | "saving" | "joined" | "error";

// "Get notified when Pro is ready": saves the account email, which limit was
// hit, and the date (created_at). Joining twice for the same limit is a no-op.
export function useWaitlist(email: string | null) {
  const [state, setState] = useState<WaitlistState>("idle");

  async function join(limit: LimitKind): Promise<void> {
    if (!supabase || !email) {
      setState("error");
      return;
    }
    setState("saving");
    const { error } = await supabase
      .from("waitlist")
      .upsert(
        { email, limit_hit: limit },
        { onConflict: "user_id,limit_hit", ignoreDuplicates: true },
      );
    setState(error ? "error" : "joined");
  }

  return { state, join, reset: () => setState("idle") };
}
