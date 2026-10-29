"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PLATFORM_ORDER, type PlatformRow } from "../../lib/downloads";
import { DownloadsTab } from "./downloads-tab";
import { OverviewTab } from "./overview-tab";
import { WaitlistTab } from "./waitlist-tab";
import { SwitchesTab } from "./switches-tab";
import { BannerTab } from "./banner-tab";

type Phase = "loading" | "email" | "code" | "denied" | "ready";
type Tab = "overview" | "downloads" | "waitlist" | "switches" | "banner";
const TABS: Array<[Tab, string]> = [["overview", "Overview"], ["downloads", "Downloads"], ["waitlist", "Waitlist"], ["switches", "Switches"], ["banner", "Banner"]];

export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState<PlatformRow[]>([]);
  const [tab, setTab] = useState<Tab>("overview");

  const enter = useCallback(async () => {
    if (!supabase) { setPhase("denied"); return; }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin !== true) { await supabase.auth.signOut(); setPhase("denied"); return; }
    const { data } = await supabase.from("platform_downloads").select("*");
    const list = (data ?? []) as PlatformRow[];
    list.sort((a, b) => PLATFORM_ORDER.indexOf(a.key) - PLATFORM_ORDER.indexOf(b.key));
    setRows(list);
    setPhase("ready");
  }, []);

  useEffect(() => {
    if (!supabase) { setPhase("denied"); return; }
    void supabase.auth.getSession().then(({ data }) => { if (data.session) void enter(); else setPhase("email"); });
  }, [enter]);

  async function requestCode() {
    if (!supabase) return false;
    // Same message whether or not the address is allowed, so this form reveals nothing.
    // Only the rate-limit error is shown, because it says nothing about the address.
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    if (error && (error.status === 429 || /seconds|rate limit/i.test(error.message))) {
      setNotice("A code was already sent a moment ago. Use the newest email, or wait a minute and send a new one.");
      return false;
    }
    setNotice("If that address has access, a 6-digit code is on its way. Only the newest code works.");
    return true;
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    await requestCode();
    setPhase("code");
  }

  async function resend() {
    setNotice("");
    setCode("");
    await requestCode();
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setNotice("");
    const token = code.replace(/\D/g, "");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    if (error) {
      setNotice("That code is wrong, expired, or was replaced by a newer one. Use the code from the newest email, or send a new code.");
      return;
    }
    setPhase("loading");
    await enter();
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setRows([]);
    setCode("");
    setPhase("email");
  }

  if (phase === "loading") return <main className="adm-shell" aria-busy="true" />;
  if (phase === "denied") {
    return (
      <main className="adm-shell adm-404">
        <h1>404</h1>
        <p>This page could not be found.</p>
      </main>
    );
  }
  if (phase === "email" || phase === "code") {
    return (
      <main className="adm-shell adm-login">
        <form onSubmit={phase === "email" ? sendCode : verify}>
          <h1>Sign in</h1>
          {phase === "email" ? (
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          ) : (
            <label>6-digit code<input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9 ]{6,12}" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          )}
          <button type="submit" className="adm-primary">{phase === "email" ? "Send code" : "Verify"}</button>
          {phase === "code" && (
            <div className="adm-row">
              <button type="button" onClick={() => void resend()}>Send a new code</button>
              <button type="button" onClick={() => { setPhase("email"); setCode(""); setNotice(""); }}>Change email</button>
            </div>
          )}
          {notice && <p className="adm-msg" role="status">{notice}</p>}
        </form>
      </main>
    );
  }
  return (
    <main className="adm-shell">
      <header className="adm-top">
        <h1>eqlShare admin</h1>
        <button type="button" onClick={() => void signOut()}>Sign out</button>
      </header>
      <nav className="adm-tabs" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "on" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {tab === "overview" && <OverviewTab rows={rows} />}
      {tab === "downloads" && <DownloadsTab rows={rows} onSaved={(next) => setRows((prev) => prev.map((r) => (r.key === next.key ? next : r)))} />}
      {tab === "waitlist" && <WaitlistTab />}
      {tab === "switches" && <SwitchesTab />}
      {tab === "banner" && <BannerTab />}
    </main>
  );
}
