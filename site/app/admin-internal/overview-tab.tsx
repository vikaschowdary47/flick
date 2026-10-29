"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { formatBytes, type PlatformRow } from "../../lib/downloads";

type Stats = { users: number; new_users_7d: number; files_now: number; bytes_stored: number; site_waitlist: number; pro_waitlist: number; downloads: number };

export function OverviewTab({ rows }: { rows: PlatformRow[] }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.rpc("admin_stats").then(({ data, error: err }) => {
      if (err) setError(err.message); else setStats(data as Stats);
    });
  }, []);

  const tiles: Array<[string, string]> = stats ? [
    ["Accounts", stats.users.toLocaleString()],
    ["New in 7 days", stats.new_users_7d.toLocaleString()],
    ["Files stored now", stats.files_now.toLocaleString()],
    ["Storage used", formatBytes(Number(stats.bytes_stored)) || "0 B"],
    ["Site waitlist", stats.site_waitlist.toLocaleString()],
    ["Pro waitlist", stats.pro_waitlist.toLocaleString()],
    ["Website downloads", Number(stats.downloads).toLocaleString()],
  ] : [];

  return (
    <>
      {error && <p className="adm-msg err">Could not load numbers: {error}. Has the second migration been run?</p>}
      <div className="adm-tiles">
        {tiles.map(([label, value]) => (
          <div className="adm-tile" key={label}><b>{value}</b><span>{label}</span></div>
        ))}
      </div>
      <h2 className="adm-h2">Downloads by platform</h2>
      <div className="adm-tiles">
        {rows.map((r) => (
          <div className="adm-tile" key={r.key}><b>{r.download_count.toLocaleString()}</b><span>{r.label} · {r.status.replace("_", " ")}</span></div>
        ))}
      </div>
    </>
  );
}
