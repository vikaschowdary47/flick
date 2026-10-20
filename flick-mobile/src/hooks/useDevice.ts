import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { supabase } from "../lib/supabase";

export const DEVICE_NAME_MAX = 30;

const storageKey = (userId: string) => `flick.device.v1.${userId}`;

// "Vikas's iPhone" where the system shares it, otherwise the model ("Pixel 8").
function defaultName(): string {
  const name = (Device.deviceName ?? Device.modelName ?? "").trim();
  const fallback = Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android phone" : "Phone";
  return (name || fallback).slice(0, DEVICE_NAME_MAX);
}

function platformName(): string {
  return Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web" ? Platform.OS : "other";
}

// Registers this phone once per account (its id is kept on the device) and
// keeps every device's name live, for "from <device>" on file cards.
export function useDevice(userId: string) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadNames = useCallback(async () => {
    const { data, error } = await supabase.from("devices").select("id, name");
    if (error || !data) return;
    setNames(Object.fromEntries(data.map((row) => [row.id as string, row.name as string])));
  }, []);

  useEffect(() => {
    let active = true;

    async function register() {
      try {
        const stored = await AsyncStorage.getItem(storageKey(userId));
        if (stored) {
          // Still there? (It could have been removed on the server.)
          const { data } = await supabase.from("devices").select("id").eq("id", stored).maybeSingle();
          if (data) {
            if (active) setDeviceId(stored);
            return;
          }
        }
        const { data, error } = await supabase
          .from("devices")
          .insert({ user_id: userId, name: defaultName(), platform: platformName() })
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("no device row");
        await AsyncStorage.setItem(storageKey(userId), data.id);
        if (active) setDeviceId(data.id);
        void loadNames();
      } catch (err) {
        // Uploads still work without a device id; the card just won't say who sent it.
        console.warn("Flick couldn't register this device", err);
      }
    }

    void register();
    void loadNames();

    const channel = supabase
      .channel(`devices-mobile-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices", filter: `user_id=eq.${userId}` },
        () => void loadNames(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, loadNames]);

  // Returns an error message, or null when saved.
  const rename = useCallback(
    async (next: string): Promise<string | null> => {
      const name = next.trim().slice(0, DEVICE_NAME_MAX);
      if (!deviceId) return "This device isn't registered yet. Try again in a moment.";
      if (!name) return "Give this device a name.";
      const { error } = await supabase.from("devices").update({ name }).eq("id", deviceId);
      if (error) return /network|fetch/i.test(error.message) ? "Couldn't save. Check your connection." : "Couldn't save that name.";
      setNames((current) => ({ ...current, [deviceId]: name }));
      return null;
    },
    [deviceId],
  );

  const name = deviceId ? names[deviceId] ?? null : null;

  return { deviceId, name, names, rename };
}
