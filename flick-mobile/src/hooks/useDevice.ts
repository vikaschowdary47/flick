import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import { limitFromError } from "../lib/limits";
import { supabase } from "../lib/supabase";

export const DEVICE_NAME_MAX = 30;

// One random key per install, shared by every account on this phone. The
// server reuses a device row when the same key signs in again.
const INSTALL_KEY = "flick.install.v1";
// Row id saved by older builds (before device keys); adopted once.
const legacyKey = (userId: string) => `flick.device.v1.${userId}`;

export type DeviceRow = {
  id: string;
  name: string;
  platform: string;
  last_seen_at: string;
  widget_mode?: Partial<WidgetMode> | null;
};

// Which widgets are on for this device (devices.widget_mode). Defaults match
// the migration, and apply until the column exists or loads.
export type WidgetMode = {
  home: boolean;
  lock: boolean;
  lock_content: boolean;
  live_activity: boolean;
  android_widget: boolean;
  bubble: boolean;
};

export const DEFAULT_WIDGET_MODE: WidgetMode = {
  home: true,
  lock: true,
  lock_content: false,
  live_activity: true,
  android_widget: true,
  bubble: false,
};

// "Vikas's iPhone" where the system shares it, otherwise the model ("Pixel 8").
function defaultName(): string {
  const name = (Device.deviceName ?? Device.modelName ?? "").trim();
  const fallback = Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android phone" : "Phone";
  return (name || fallback).slice(0, DEVICE_NAME_MAX);
}

async function installKey(): Promise<string> {
  const stored = await AsyncStorage.getItem(INSTALL_KEY);
  if (stored) return stored;
  const key = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALL_KEY, key);
  return key;
}

// Registers this phone (server enforces max_devices), keeps every device's
// name and last-active time live, and signs out if this device is removed
// from another one.
export function useDevice(userId: string, onRemoved: () => void) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [limitHit, setLimitHit] = useState(false);
  const deviceIdRef = useRef<string | null>(null);
  const onRemovedRef = useRef(onRemoved);
  onRemovedRef.current = onRemoved;

  const loadDevices = useCallback(async () => {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .order("last_seen_at", { ascending: false });
    if (error || !data) return;
    setDevices(data as DeviceRow[]);
    // Our row is gone: removed from another device (its session was ended).
    const mine = deviceIdRef.current;
    if (mine && !data.some((row) => row.id === mine)) onRemovedRef.current();
  }, []);

  const register = useCallback(async () => {
    try {
      const key = await installKey();
      const legacyId = await AsyncStorage.getItem(legacyKey(userId));
      const { data, error } = await supabase.rpc("register_device", {
        p_device_key: key,
        p_name: defaultName(),
        p_platform: Platform.OS,
        p_legacy_id: legacyId,
      });
      if (error) {
        if (limitFromError(error) === "devices") setLimitHit(true);
        else console.warn("Flick couldn't register this device", error);
        return;
      }
      if (legacyId) await AsyncStorage.removeItem(legacyKey(userId));
      deviceIdRef.current = data as string;
      setDeviceId(data as string);
      setLimitHit(false);
      void loadDevices();
    } catch (err) {
      // Uploads still work without a device id; cards just won't say who sent it.
      console.warn("Flick couldn't register this device", err);
    }
  }, [userId, loadDevices]);

  useEffect(() => {
    void register();
    void loadDevices();
    const channel = supabase
      .channel(`devices-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices", filter: `user_id=eq.${userId}` },
        () => void loadDevices(),
      )
      // DELETE events can't be filtered by user_id.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "devices" }, () => void loadDevices())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, register, loadDevices]);

  // Returns an error message, or null when saved.
  const rename = useCallback(
    async (next: string): Promise<string | null> => {
      const name = next.trim().slice(0, DEVICE_NAME_MAX);
      if (!deviceId) return "This device isn't registered yet. Try again in a moment.";
      if (!name) return "Give this device a name.";
      const { error } = await supabase.from("devices").update({ name }).eq("id", deviceId);
      if (error) return /network|fetch/i.test(error.message) ? "Couldn't save. Check your connection." : "Couldn't save that name.";
      setDevices((current) => current.map((row) => (row.id === deviceId ? { ...row, name } : row)));
      return null;
    },
    [deviceId],
  );

  // Removes another device (and ends its session), then retries registering
  // this one if it was blocked by the device limit.
  const removeDevice = useCallback(
    async (id: string): Promise<string | null> => {
      const { error } = await supabase.rpc("remove_device", { p_device_id: id });
      if (error) return "Couldn't remove that device. Try again.";
      setDevices((current) => current.filter((row) => row.id !== id));
      if (!deviceIdRef.current) await register();
      return null;
    },
    [register],
  );

  // Turn one widget switch on or off for this device. Returns an error or null.
  const setWidgetMode = useCallback(
    async (changes: Partial<WidgetMode>): Promise<string | null> => {
      if (!deviceId) return "This device isn't registered yet.";
      const current = { ...DEFAULT_WIDGET_MODE, ...(devices.find((row) => row.id === deviceId)?.widget_mode ?? {}) };
      const next = { ...current, ...changes };
      setDevices((rows) => rows.map((row) => (row.id === deviceId ? { ...row, widget_mode: next } : row)));
      const { error } = await supabase.from("devices").update({ widget_mode: next }).eq("id", deviceId);
      if (error) {
        void loadDevices();
        return "Couldn't save that setting.";
      }
      return null;
    },
    [deviceId, devices, loadDevices],
  );

  const names = Object.fromEntries(devices.map((row) => [row.id, row.name]));
  const widgetMode: WidgetMode = {
    ...DEFAULT_WIDGET_MODE,
    ...(deviceId ? devices.find((row) => row.id === deviceId)?.widget_mode ?? {} : {}),
  };
  const name = deviceId ? names[deviceId] ?? null : null;

  return {
    deviceId,
    name,
    names,
    devices,
    rename,
    removeDevice,
    widgetMode,
    setWidgetMode,
    limitHit,
    clearLimit: () => setLimitHit(false),
  };
}
