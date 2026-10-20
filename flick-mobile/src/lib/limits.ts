// Free-plan limits. The real enforcement is the files_enforce_limits trigger
// in supabase/migrations; these numbers are only for messages in the app.
export const FREE_MAX_PINS = 3;
export const FREE_MAX_BYTES = 524288000; // 500 MB

export type LimitKind = "pins" | "storage";

// The trigger's errors start with FLICK_LIMIT_PINS / FLICK_LIMIT_STORAGE.
export function limitFromError(error: unknown): LimitKind | null {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  if (message.includes("FLICK_LIMIT_PINS")) return "pins";
  if (message.includes("FLICK_LIMIT_STORAGE")) return "storage";
  return null;
}
