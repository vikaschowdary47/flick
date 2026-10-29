"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { PLATFORM_ORDER, formatBytes, type PlatformKey, type PlatformRow } from "../lib/downloads";

type Visible = Pick<PlatformRow, "key" | "label" | "status" | "version" | "size_bytes">;

const FALLBACK = ["iOS", "Android", "Mac", "Windows"];
const SHORT: Record<PlatformKey, string> = { mac: "Mac", windows: "Windows", microsoft: "Microsoft Store", ios: "iPhone", android: "Android" };

function detectFirst(): PlatformKey[] {
  if (typeof navigator === "undefined") return [];
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return ["ios"];
  if (/Android/i.test(ua)) return ["android"];
  if (/Windows/i.test(ua)) return ["windows", "microsoft"];
  if (/Macintosh|Mac OS X/i.test(ua)) return ["mac"];
  return [];
}

// Shows download buttons for platforms switched to "Live" in the admin dashboard, "soon" badges for
// "Coming soon", and the original static chips when nothing has been published yet.
export function PlatformDownloads() {
  const [rows, setRows] = useState<Visible[] | null>(null);
  const [first, setFirst] = useState<PlatformKey[]>([]);

  useEffect(() => {
    setFirst(detectFirst());
    if (!supabase) { setRows([]); return; }
    let cancelled = false;
    void supabase
      .from("platform_downloads")
      .select("key,label,status,version,size_bytes")
      .in("status", ["live", "coming_soon"])
      .then(({ data, error }) => { if (!cancelled) setRows(error ? [] : ((data ?? []) as Visible[])); });
    return () => { cancelled = true; };
  }, []);

  if (!rows || rows.length === 0) {
    return (
      <div className="platforms">
        <span>Coming soon to</span>
        {FALLBACK.map((name) => <b key={name}>{name}</b>)}
      </div>
    );
  }

  const rank = (key: PlatformKey) => {
    const i = first.indexOf(key);
    return i === -1 ? 100 + PLATFORM_ORDER.indexOf(key) : i;
  };
  const sorted = [...rows].sort((a, b) => rank(a.key) - rank(b.key));
  const live = sorted.filter((r) => r.status === "live");
  const soon = sorted.filter((r) => r.status === "coming_soon");

  return (
    <div className="platform-downloads">
      {live.length > 0 && (
        <div className="pd-buttons">
          {live.map((r, i) => (
            <a key={r.key} className={`pd-button${i === 0 && first.includes(r.key) ? " pd-primary" : ""}`} href={`/download/${r.key}`} rel="nofollow">
              <span>Get for {SHORT[r.key]}</span>
              {(r.version || r.size_bytes) && <small>{[r.version && `v${r.version}`, formatBytes(r.size_bytes)].filter(Boolean).join(" · ")}</small>}
            </a>
          ))}
        </div>
      )}
      {soon.length > 0 && (
        <div className="platforms">
          <span>Coming soon to</span>
          {soon.map((r) => <b key={r.key}>{SHORT[r.key]}</b>)}
        </div>
      )}
    </div>
  );
}
