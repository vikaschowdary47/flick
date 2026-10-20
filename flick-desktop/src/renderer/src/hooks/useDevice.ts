import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { limitFromError } from "../limits";
import { supabase } from "../supabase";

export const DEVICE_NAME_MAX = 30;

// One random key per install, shared by every account on this computer. The
// server reuses a device row when the same key signs in again.
const INSTALL_KEY = "flick.install.v1";
// Row id saved by older builds (before device keys); adopted once.
const legacyKey = (userId: string) => `flick.device.v1.${userId}`;

export interface DeviceRow {
  id: string;
  name: string;
  platform: string;
  last_seen_at: string;
}

function installKey(): string {
  const stored = window.localStorage.getItem(INSTALL_KEY);
  if (stored) {
    return stored;
  }
  const key = crypto.randomUUID();
  window.localStorage.setItem(INSTALL_KEY, key);
  return key;
}

// Registers this computer (server enforces max_devices), keeps every device's
// name and last-active time live, and signs out if this device is removed
// from another one.
export function useDevice(session: Session | null, onRemoved: () => void) {
  const userId = session?.user.id;
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [limitHit, setLimitHit] = useState(false);
  const deviceIdRef = useRef<string | null>(null);
  const onRemovedRef = useRef(onRemoved);
  onRemovedRef.current = onRemoved;

  const loadDevices = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data, error } = await supabase
      .from("devices")
      .select("id,name,platform,last_seen_at")
      .order("last_seen_at", { ascending: false });
    if (error || !data) {
      return;
    }
    setDevices(data as DeviceRow[]);
    const mine = deviceIdRef.current;
    if (mine && !data.some((row) => row.id === mine)) {
      onRemovedRef.current();
    }
  }, []);

  const register = useCallback(async () => {
    if (!supabase || !userId) {
      return;
    }
    try {
      const legacyId = window.localStorage.getItem(legacyKey(userId));
      const fallback = await window.flick.getDefaultDevice();
      const { data, error } = await supabase.rpc("register_device", {
        p_device_key: installKey(),
        p_name: fallback.name.slice(0, DEVICE_NAME_MAX),
        p_platform: fallback.platform,
        p_legacy_id: legacyId,
      });
      if (error) {
        if (limitFromError(error) === "devices") {
          setLimitHit(true);
        } else {
          console.error("Could not register this Flick device:", error);
        }
        return;
      }
      if (legacyId) {
        window.localStorage.removeItem(legacyKey(userId));
      }
      deviceIdRef.current = data as string;
      setDeviceId(data as string);
      setLimitHit(false);
      void loadDevices();
    } catch (error: unknown) {
      // Uploads still work; cards just won't say who sent them.
      console.error("Could not register this Flick device:", error);
    }
  }, [userId, loadDevices]);

  useEffect(() => {
    deviceIdRef.current = null;
    setDeviceId(null);
    setDevices([]);
    setLimitHit(false);
    if (!supabase || !userId) {
      return;
    }
    const client = supabase;
    void register();
    void loadDevices();

    const channel = client
      .channel(`devices:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "devices",
          filter: `user_id=eq.${userId}`,
        },
        () => void loadDevices(),
      )
      // DELETE events can't be filtered by user_id.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "devices" },
        () => void loadDevices(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, register, loadDevices]);

  // Returns an error message, or null when saved.
  async function rename(next: string): Promise<string | null> {
    const name = next.trim().slice(0, DEVICE_NAME_MAX);
    if (!supabase || !deviceId) {
      return "This device isn't registered yet. Try again in a moment.";
    }
    if (!name) {
      return "Give this device a name.";
    }
    const { error } = await supabase
      .from("devices")
      .update({ name })
      .eq("id", deviceId);
    if (error) {
      return "Couldn't save that name.";
    }
    setDevices((current) =>
      current.map((row) => (row.id === deviceId ? { ...row, name } : row)),
    );
    return null;
  }

  // Removes another device (and ends its session), then retries registering
  // this one if it was blocked by the device limit.
  async function removeDevice(id: string): Promise<string | null> {
    if (!supabase) {
      return "Flick isn't connected.";
    }
    const { error } = await supabase.rpc("remove_device", { p_device_id: id });
    if (error) {
      return "Couldn't remove that device. Try again.";
    }
    setDevices((current) => current.filter((row) => row.id !== id));
    if (!deviceIdRef.current) {
      await register();
    }
    return null;
  }

  const deviceNames = Object.fromEntries(devices.map((row) => [row.id, row.name]));

  return {
    deviceId,
    deviceName: deviceId ? (deviceNames[deviceId] ?? null) : null,
    deviceNames,
    devices,
    renameDevice: rename,
    removeDevice,
    limitHit,
    clearLimit: () => setLimitHit(false),
  };
}
