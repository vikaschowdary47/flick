import { useState } from "react";
export default function DeleteAccount({ onDelete }: { onDelete: () => Promise<string | null> }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!confirming) return <button type="button" className="settings-sign-out" onClick={() => setConfirming(true)}>Delete account</button>;
  return <section className="settings-group" aria-label="Delete account confirmation">
    <p className="settings-label">Delete your account permanently?</p>
    <p className="settings-help">This removes your account, files, clips, devices and profile. This cannot be undone. Type DELETE to confirm.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
    <label className="settings-label">Confirmation
      <input className="settings-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="off" disabled={busy} aria-label="Type DELETE to confirm account deletion" />
    </label>
    <button type="button" className="settings-sign-out" disabled={busy || confirmation !== "DELETE"} onClick={() => {
      setBusy(true); setError("");
      void onDelete().then((message) => setError(message ?? "")).catch(() => setError("Couldn't delete your account. Try again.")).finally(() => setBusy(false));
    }}>{busy ? "Deleting account…" : "Permanently delete account"}</button>
    <button type="button" className="auth-link" disabled={busy} onClick={() => { setConfirming(false); setConfirmation(""); setError(""); }}>Cancel</button>
  </section>;
}
