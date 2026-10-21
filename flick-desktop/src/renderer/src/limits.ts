// Plan limits live in the plan_limits table and are enforced in the database
// (supabase/migrations/20261022120000_plan_limits.sql). The app only reads
// them (get_usage) to word messages, so they can change without an update.

export type LimitKind = "pins" | "storage" | "devices" | "sharing";

export interface Usage {
  plan: string;
  pinsUsed: number;
  maxPins: number;
  storageUsedBytes: number;
  maxStorageMb: number;
  devicesUsed: number;
  maxDevices: number;
}

// The server raises pin_limit / storage_limit / device_limit.
export function limitFromError(error: unknown): LimitKind | null {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : String(error);
  if (/\bpin_limit\b/.test(message)) {
    return "pins";
  }
  if (/\bstorage_limit\b/.test(message)) {
    return "storage";
  }
  if (/\bdevice_limit\b/.test(message)) {
    return "devices";
  }
  return null;
}
