"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Flag = { name: string; enabled: boolean; description: string | null };

const WARN: Record<string, string> = {
  payments: "Payments controls the purchase screens in the live apps. Change it only when the payment setup is ready. Continue?",
  clipboard: "This turns Clips on or off for every user right away. Continue?",
};

export function SwitchesTab() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("feature_flags").select("name,enabled,description").order("name").then(({ data }) => setFlags((data ?? []) as Flag[]));
  }, []);

  async function toggle(flag: Flag) {
    if (!supabase) return;
    const next = !flag.enabled;
    if (!window.confirm(`Turn ${flag.name} ${next ? "ON" : "OFF"}?\n\n${WARN[flag.name] ?? "This affects every user immediately. Continue?"}`)) return;
    setBusy(flag.name);
    setMessage("");
    const { data, error } = await supabase.from("feature_flags").update({ enabled: next }).eq("name", flag.name).select("name,enabled,description").single();
    setBusy("");
    if (error || !data) { setMessage(error?.message || "Could not change it."); return; }
    setFlags((prev) => prev.map((f) => (f.name === flag.name ? (data as Flag) : f)));
  }

  return (
    <>
      <p className="adm-lead">These switches control the apps directly. A change reaches every signed-in device within seconds.</p>
      <div className="adm-grid">
        {flags.map((f) => (
          <section className="adm-card" key={f.name}>
            <header><h2>{f.name}</h2><span className={`adm-pill ${f.enabled ? "adm-live" : ""}`}>{f.enabled ? "On" : "Off"}</span></header>
            <p className="adm-meta">{f.description}</p>
            <div><button type="button" className="adm-primary" disabled={busy === f.name} onClick={() => void toggle(f)}>{busy === f.name ? "Saving…" : f.enabled ? "Turn off" : "Turn on"}</button></div>
          </section>
        ))}
      </div>
      {message && <p className="adm-msg err">{message}</p>}
    </>
  );
}
