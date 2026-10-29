"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isWebUrl } from "../../lib/downloads";

export function BannerTab() {
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("site_announcement").select("enabled,message,link_url").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (error) { setMsg({ kind: "err", text: `${error.message}. Has the second migration been run?` }); return; }
      if (data) { setEnabled(Boolean(data.enabled)); setText(String(data.message ?? "")); setLink(String(data.link_url ?? "")); }
    });
  }, []);

  async function save() {
    if (!supabase) return;
    const cleanLink = link.trim();
    if (cleanLink && !isWebUrl(cleanLink)) { setMsg({ kind: "err", text: "The link must start with https://" }); return; }
    if (enabled && !text.trim()) { setMsg({ kind: "err", text: "Write a message before turning the banner on." }); return; }
    setBusy(true);
    const { error } = await supabase.from("site_announcement").update({ enabled, message: text.trim(), link_url: cleanLink || null, updated_at: new Date().toISOString() }).eq("id", 1);
    setBusy(false);
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: enabled ? "Saved. The banner is live on the home page." : "Saved. The banner is off." });
  }

  return (
    <section className="adm-card adm-narrow">
      <header><h2>Site announcement</h2><span className={`adm-pill ${enabled ? "adm-live" : ""}`}>{enabled ? "On" : "Off"}</span></header>
      <label className="adm-check"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Show the banner on the home page</label>
      <label>Message ({text.length}/200)<input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="eqlShare for Mac is out. Download it now." /></label>
      <label>Optional link<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" /></label>
      {text.trim() && <div className="adm-preview">{text.trim()}{link.trim() && " →"}</div>}
      <footer><button type="button" className="adm-primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button></footer>
      {msg && <p className={`adm-msg ${msg.kind}`} role="status">{msg.text}</p>}
    </section>
  );
}
