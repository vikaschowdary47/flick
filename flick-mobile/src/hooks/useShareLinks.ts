import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { expiresAt } from "../lib/format";
import type { FileRow } from "../lib/types";
import type { LimitKind } from "../lib/limits";

const SHARE_BASE_URL = process.env.EXPO_PUBLIC_FLICK_SHARE_BASE_URL || "https://flickit.dev/d";
const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

type ShareLinkRow = {
  id: string;
  file_id: string;
  expires_at: string;
  revoked_at: string | null;
};

function hexId(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function randomLinkId(): Promise<string> {
  return hexId(await Crypto.getRandomBytesAsync(32));
}

async function hashLinkId(rawId: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawId, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

function linkExpiresAt(file: FileRow): string {
  return new Date(Math.min(Date.now() + LINK_LIFETIME_MS, expiresAt(file))).toISOString();
}

export function useShareLinks(userId: string) {
  const [activeByFile, setActiveByFile] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [limitHit, setLimitHit] = useState<LimitKind | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("share_links")
      .select("id, file_id, expires_at, revoked_at")
      .eq("owner_id", userId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .returns<ShareLinkRow[]>();
    const next: Record<string, string> = {};
    for (const link of data ?? []) next[link.file_id] = link.id;
    setActiveByFile(next);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (file: FileRow) => {
    setLimitHit(null);
    if (file.size > MAX_FILE_BYTES) {
      setLimitHit("sharing");
      return;
    }
    try {
      const rawId = await randomLinkId();
      const idHash = await hashLinkId(rawId);
      const { data, error } = await supabase
        .from("share_links")
        .insert({ owner_id: userId, file_id: file.id, id_hash: idHash, expires_at: linkExpiresAt(file) })
        .select("id")
        .single<{ id: string }>();
      if (error || !data) throw error ?? new Error("Couldn’t create the share link.");
      await Clipboard.setStringAsync(`${SHARE_BASE_URL.replace(/\/$/, "")}/${rawId}`);
      setActiveByFile((current) => ({ ...current, [file.id]: data.id }));
      setStatus("Share link copied to the clipboard.");
    } catch (error: unknown) {
      setStatus(error instanceof Error && error.message ? error.message : "Couldn’t create the share link.");
    }
  }, [userId]);

  const revoke = useCallback(async (file: FileRow) => {
    const linkId = activeByFile[file.id];
    if (!linkId) return;
    const { error } = await supabase.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", linkId);
    if (error) {
      setStatus(error.message || "Couldn’t revoke the share link.");
      return;
    }
    setActiveByFile((current) => {
      const next = { ...current };
      delete next[file.id];
      return next;
    });
    setStatus("Share link revoked.");
  }, [activeByFile]);

  return {
    create,
    revoke,
    hasShareLink: (file: FileRow) => Boolean(activeByFile[file.id]),
    status,
    limitHit,
    clearLimit: () => setLimitHit(null),
  };
}
