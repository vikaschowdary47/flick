import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CloudFile } from "../types";
import { expiresAt, MAX_FILE_SIZE } from "../types";
import { supabase } from "../supabase";

const SHARE_BASE_URL = import.meta.env.VITE_FLICK_SHARE_BASE_URL || "https://eqlshare.com/d";
const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

type ShareLinkRow = {
  id: string;
  file_id: string;
  expires_at: string;
  revoked_at: string | null;
};

function randomLinkId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashLinkId(rawId: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawId));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function linkExpiresAt(file: CloudFile): string {
  return new Date(Math.min(Date.now() + LINK_LIFETIME_MS, expiresAt(file))).toISOString();
}

function shareUrl(rawId: string): string {
  return `${SHARE_BASE_URL.replace(/\/$/, "")}/${rawId}`;
}

export function useShareLinks(session: Session | null) {
  const [activeByFile, setActiveByFile] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [limitHit, setLimitHit] = useState(false);

  const refresh = useCallback(async () => {
    if (!session || !supabase) {
      setActiveByFile({});
      return;
    }
    const { data } = await supabase
      .from("share_links")
      .select("id, file_id, expires_at, revoked_at")
      .eq("owner_id", session.user.id)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .returns<ShareLinkRow[]>();
    const next: Record<string, string> = {};
    for (const link of data ?? []) next[link.file_id] = link.id;
    setActiveByFile(next);
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (file: CloudFile) => {
    setLimitHit(false);
    if (file.size > MAX_FILE_SIZE) {
      setLimitHit(true);
      return;
    }
    if (activeByFile[file.id]) {
      setStatus("This file already has an active share link. Revoke it first.");
      return;
    }
    if (!session || !supabase) {
      setStatus("Sign in before creating a share link.");
      return;
    }
    try {
      const rawId = randomLinkId();
      const idHash = await hashLinkId(rawId);
      const { data, error } = await supabase
        .from("share_links")
        .insert({
          owner_id: session.user.id,
          file_id: file.id,
          id_hash: idHash,
          expires_at: linkExpiresAt(file),
        })
        .select("id")
        .single<{ id: string }>();
      if (error || !data) throw error ?? new Error("Could not create the share link.");
      await window.flick.writeClipboard(shareUrl(rawId));
      setActiveByFile((current) => ({ ...current, [file.id]: data.id }));
      setStatus("Share link copied to the clipboard.");
      window.setTimeout(() => setStatus(""), 4000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message || "Couldn’t create the share link.");
    }
  }, [activeByFile, session]);

  const revoke = useCallback(async (file: CloudFile) => {
    const linkId = activeByFile[file.id];
    if (!linkId || !supabase) return;
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
    window.setTimeout(() => setStatus(""), 4000);
  }, [activeByFile]);

  return {
    create,
    revoke,
    hasShareLink: (file: CloudFile) => Boolean(activeByFile[file.id]),
    status,
    limitHit,
    clearLimit: () => setLimitHit(false),
  };
}
