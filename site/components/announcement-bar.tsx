"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Announcement = { message: string; link_url: string | null };
const DISMISS_KEY = "eql-announcement-dismissed";

// A single dismissible line above the nav, controlled from the admin dashboard (Banner tab).
// The message is plain text only, never HTML.
export function AnnouncementBar() {
  const [note, setNote] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from("site_announcement")
      .select("message,link_url,enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data || !data.enabled || !String(data.message).trim()) return;
        let dismissed = "";
        try { dismissed = window.sessionStorage.getItem(DISMISS_KEY) ?? ""; } catch { /* storage unavailable */ }
        if (dismissed === data.message) return;
        setNote({ message: String(data.message), link_url: data.link_url ? String(data.link_url) : null });
      });
    return () => { cancelled = true; };
  }, []);

  if (!note) return null;
  const safeLink = note.link_url && /^https?:\/\//i.test(note.link_url) ? note.link_url : null;

  function dismiss() {
    try { window.sessionStorage.setItem(DISMISS_KEY, note?.message ?? ""); } catch { /* storage unavailable */ }
    setNote(null);
  }

  return (
    <div className="announce" role="region" aria-label="Announcement">
      {safeLink ? <a href={safeLink} rel="noopener noreferrer">{note.message} <span aria-hidden="true">→</span></a> : <span>{note.message}</span>}
      <button type="button" onClick={dismiss} aria-label="Dismiss announcement">×</button>
    </div>
  );
}
