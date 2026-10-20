import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export const DEVICE_NAME_MAX = 30;

const storageKey = (userId: string) => `flick.device.v1.${userId}`;

// Registers this computer once per account (its id is kept in localStorage)
// and keeps every device's name live, for "from <device>" on file cards.
export function useDevice(session: Session | null) {
  const userId = session?.user.id;
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadNames = useCallback(async () => {
    if (!supabase) {
      return;
    }
    const { data, error } = await supabase.from("devices").select("id,name");
    if (error || !data) {
      return;
    }
    setNames(
      Object.fromEntries(data.map((row) => [row.id as string, row.name as string])),
    );
  }, []);

  useEffect(() => {
    setDeviceId(null);
    setNames({});
    if (!supabase || !userId) {
      return;
    }
    const client = supabase;
    let active = true;

    async function register(): Promise<void> {
      try {
        const stored = window.localStorage.getItem(storageKey(userId!));
        if (stored) {
          const { data } = await client
            .from("devices")
            .select("id")
            .eq("id", stored)
            .maybeSingle();
          if (data) {
            if (active) {
              setDeviceId(stored);
            }
            return;
          }
        }
        const fallback = await window.flick.getDefaultDevice();
        const { data, error } = await client
          .from("devices")
          .insert({
            user_id: userId,
            name: fallback.name.slice(0, DEVICE_NAME_MAX),
            platform: fallback.platform,
          })
          .select("id")
          .single();
        if (error || !data) {
          throw error ?? new Error("No device row returned.");
        }
        window.localStorage.setItem(storageKey(userId!), data.id);
        if (active) {
          setDeviceId(data.id);
        }
        void loadNames();
      } catch (error: unknown) {
        // Uploads still work; cards just won't say who sent them.
        console.error("Could not register this Flick device:", error);
      }
    }

    void register();
    void loadNames();

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
        () => void loadNames(),
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [userId, loadNames]);

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
    setNames((current) => ({ ...current, [deviceId]: name }));
    return null;
  }

  return {
    deviceId,
    deviceName: deviceId ? (names[deviceId] ?? null) : null,
    deviceNames: names,
    renameDevice: rename,
  };
}
