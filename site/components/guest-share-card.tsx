"use client";
import { useState } from "react";

// PREVIEW ONLY. This is the new "send without signing in" card from the website
// mockups. It does not upload anything, create links or touch Supabase yet.
// The page shows it only when NEXT_PUBLIC_GUEST_SHARE=true; otherwise the
// waitlist form stays exactly as it is today.

type Tab = "send" | "get";

const CHECK = "M5 12.5l4.5 4.5L19 7";

function Icon({ d, size = 20, stroke = 2 }: { d: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function GuestShareCard() {
  const [tab, setTab] = useState<Tab>("send");
  const [sent, setSent] = useState(false);

  return (
    <div className="gs-card">
      <span className="gs-preview">Preview, not live yet</span>
      <div className="gs-tabs" role="tablist" aria-label="Send or get">
        <button type="button" role="tab" aria-selected={tab === "send"} className={tab === "send" ? "on" : ""} onClick={() => setTab("send")}>Send</button>
        <button type="button" role="tab" aria-selected={tab === "get"} className={tab === "get" ? "on" : ""} onClick={() => setTab("get")}>Get file</button>
      </div>

      {tab === "send" && !sent && (
        <div>
          <div className="gs-drop">
            <button type="button" className="gs-send" aria-label="Choose files to send" onClick={() => setSent(true)}>
              <Icon d="M12 19V5M6 11l6-6 6 6" size={24} stroke={2.4} />
            </button>
            <p className="gs-drop-title">Drop files here</p>
            <p className="gs-drop-sub">or tap the button to choose from your device</p>
          </div>
          <div className="gs-fuse-row">
            <span>Link works for <strong>1 hour</strong></span>
            <a href="#sync">Sign in for 24 hours</a>
          </div>
          <div className="gs-fuse"><i style={{ width: "4%" }} /></div>
        </div>
      )}

      {tab === "send" && sent && (
        <div>
          <p className="gs-ready"><Icon d={CHECK} size={18} stroke={2.6} />2 files ready, 3.8 MB</p>
          <ul className="gs-files">
            <li><span className="gs-thumb" /><span><b>lake-sunset.jpg</b><small>2.1 MB</small></span></li>
            <li><span className="gs-thumb gs-pdf">PDF</span><span><b>Invoice-2026-1043.pdf</b><small>1.4 MB</small></span></li>
          </ul>
          <div className="gs-link">
            <span>eqlshare.com/d/k3x9q7m2</span>
            <button type="button">Copy link</button>
          </div>
          <div className="gs-code"><span>Or share the code</span><b>K3X 9QF</b></div>
          <div className="gs-fuse-row">
            <span>Expires in <strong>59:42</strong></span>
            <a href="#sync">Sign in to keep it 24 hours</a>
          </div>
          <div className="gs-fuse"><i style={{ width: "98%" }} /></div>
          <p className="gs-more"><button type="button" onClick={() => setSent(false)}>Send more files</button></p>
        </div>
      )}

      {tab === "get" && (
        <div className="gs-get">
          <p className="gs-drop-title">Got a code?</p>
          <p className="gs-drop-sub">Type the 6 characters you were given.</p>
          <div role="group" aria-label="Share code" className="gs-boxes">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input key={i} type="text" maxLength={1} inputMode="text" autoCapitalize="characters" aria-label={`Code character ${i + 1}`} />
            ))}
          </div>
          <button type="button" className="gs-primary" disabled>Get file</button>
          <p className="gs-note">Got a link instead? Just open it. No code needed.</p>
        </div>
      )}
    </div>
  );
}

export function GuestVsSignedIn() {
  const rows = (items: string[]) => (
    <ul>
      {items.map((t) => (
        <li key={t}><Icon d={CHECK} size={18} stroke={2.4} />{t}</li>
      ))}
    </ul>
  );
  return (
    <section className="gs-sync wrap" id="sync">
      <div className="gs-sync-card" data-reveal>
        <div className="gs-sync-copy">
          <div className="section-label">Sign in to sync</div>
          <h2>Try it first. Sign in when it&rsquo;s worth it.</h2>
          <p>Guests can send and receive right away. An account keeps links longer and puts everything on all your devices.</p>
        </div>
        <div className="gs-sync-cols">
          <div className="gs-col">
            <h3>Guest</h3>
            {rows(["No sign-up", "Link and code", "Lasts 1 hour"])}
          </div>
          <div className="gs-col gs-col-on">
            <h3>Signed in</h3>
            {rows(["Lasts 24 hours", "Sync across 4 devices", "Files and clips", "3 pins, 500 MB"])}
          </div>
        </div>
      </div>
    </section>
  );
}
