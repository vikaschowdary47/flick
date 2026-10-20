import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import type { LimitKind } from "../lib/limits";

export type WaitlistState = "idle" | "saving" | "joined" | "error";

// "Get notified when Pro is ready": saves the account email, which limit was
// hit, and the date (created_at). Joining twice for the same limit is a no-op.
export function useWaitlist(email: string | null) {
  const [state, setState] = useState<WaitlistState>("idle");

  const join = useCallback(
    async (limit: LimitKind) => {
      if (!email) {
        setState("error");
        return;
      }
      setState("saving");
      const { error } = await supabase
        .from("waitlist")
        .upsert({ email, limit_hit: limit }, { onConflict: "user_id,limit_hit", ignoreDuplicates: true });
      setState(error ? "error" : "joined");
    },
    [email],
  );

  const reset = useCallback(() => setState("idle"), []);

  return { state, join, reset };
}
