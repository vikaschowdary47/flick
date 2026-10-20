import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Usage } from "../lib/limits";

// Current usage and plan limits from the server (Settings, limit screen).
export function useUsage(active: boolean) {
  const [usage, setUsage] = useState<Usage | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_usage").maybeSingle();
    if (error || !data) return;
    const row = data as Record<string, number | string>;
    setUsage({
      plan: String(row.plan),
      pinsUsed: Number(row.pins_used),
      maxPins: Number(row.max_pins),
      storageUsedBytes: Number(row.storage_used_bytes),
      maxStorageMb: Number(row.max_storage_mb),
      devicesUsed: Number(row.devices_used),
      maxDevices: Number(row.max_devices),
    });
  }, []);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  return { usage, refresh };
}
