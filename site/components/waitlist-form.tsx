"use client";
import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

type Status = "idle" | "loading" | "success" | "duplicate" | "invalid" | "config" | "failed";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [useType, setUseType] = useState("");
  const [trap, setTrap] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [joined, setJoined] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL.test(normalizedEmail)) { setStatus("invalid"); return; }
    // Bots fill the hidden field; pretend it worked and save nothing.
    if (trap) { setJoined(normalizedEmail); setStatus("success"); return; }
    if (!supabase) { setStatus("config"); return; }
    setStatus("loading");
    try {
      const params = new URLSearchParams(window.location.search);
      const source = params.get("ref") || params.get("utm_source") || "direct";
      const request = supabase.from("marketing_waitlist").insert({ email: normalizedEmail, use_type: useType || null, source });
      const timeout = new Promise<{ error: { code: string } }>((resolve) => setTimeout(() => resolve({ error: { code: "timeout" } }), 12000));
      const { error } = await Promise.race([request, timeout]);
      if (!error || error.code === "23505") {
        // Already on the list counts as success too: clear the form either way.
        setJoined(normalizedEmail);
        setEmail("");
        setUseType("");
        setStatus(error ? "duplicate" : "success");
        return;
      }
      console.warn("Waitlist signup failed:", error);
      setStatus("failed");
    } catch (error) {
      console.warn("Waitlist signup failed:", error);
      setStatus("failed");
    }
  }

  if (status === "success" || status === "duplicate") {
    return (
      <div className="form-success" role="status" aria-live="polite">
        <span className="form-success-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg></span>
        <div className="form-success-text">
          <strong>{status === "success" ? "You're on the list!" : "You're already on the list."}</strong>
          <small>We&apos;ll email {joined || "you"} when eqlShare is ready.</small>
        </div>
        <button type="button" className="form-success-again" onClick={() => { setStatus("idle"); setJoined(""); }}>Add another email</button>
      </div>
    );
  }

  const id = `email-${compact ? "footer" : "hero"}`;
  return (
    <form className={`waitlist-form ${compact ? "is-compact" : ""}`} onSubmit={submit} noValidate>
      <div className="form-row">
        <label className="sr-only" htmlFor={id}>Email address</label>
        <input id={id} name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={email}
          onChange={(e) => { setEmail(e.target.value); if (status !== "loading") setStatus("idle"); }}
          aria-invalid={status === "invalid"} aria-describedby={`${id}-note`} />
        <select aria-label="Personal or team use?" value={useType} onChange={(e) => setUseType(e.target.value)}>
          <option value="">Personal or team?</option>
          <option value="personal">Personal</option>
          <option value="team">Team</option>
        </select>
        <button disabled={status === "loading"} type="submit">{status === "loading" ? "Joining…" : "Join the waitlist"}</button>
      </div>
      {/* Hidden from people and autofill; only bots fill it. */}
      <div className="honeypot" aria-hidden="true">
        <label>Leave this empty<input tabIndex={-1} name="website_url_confirm" autoComplete="new-password" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>
      <p id={`${id}-note`} className={`form-note${["invalid", "config", "failed"].includes(status) ? " error" : ""}`} role={["invalid", "config", "failed"].includes(status) ? "alert" : undefined}>
        {status === "invalid" && "Please enter a valid email address."}
        {status === "config" && "The waitlist isn't connected yet. Please try again soon."}
        {status === "failed" && <>Something went wrong on our side. Please try again, or email <a href="mailto:support@eqlshare.com">support@eqlshare.com</a>.</>}
        {!["invalid", "config", "failed"].includes(status) && !compact && "No spam. Just a heads-up when we launch."}
      </p>
    </form>
  );
}
