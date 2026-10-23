import { useEffect, useLayoutEffect, useState } from "react";
import type { AccountType } from "../hooks/useOnboarding";

type Props = {
  initialName: string; initialType: AccountType; loading: boolean; error: string;
  onRetry: () => void; onSave: (name: string, type: AccountType) => Promise<string | null>; onSignOut: () => void;
};
export default function FirstRunProfile({ initialName, initialType, loading, error, onRetry, onSave, onSignOut }: Props) {
  useLayoutEffect(() => { window.flick.reportPopoverHeight(520, false); }, []);
  const [name, setName] = useState(initialName);
  const [edited, setEdited] = useState(false);
  const [type, setType] = useState<AccountType>(initialType);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => { if (!edited) setName(initialName); }, [initialName, edited]);
  return <main className="widget widget-auth">
    <section className="content content-auth">
      <div className="sign-in-screen">
        <h1>Make Flick yours</h1>
        <p className="sign-in-copy">Choose your name and how you'll use Flick.</p>
        {loading ? <p role="status">Loading your profile…</p> : error ? <>
          <p className="auth-error" role="alert">{error}</p>
          <button className="auth-link" onClick={onRetry}>Retry</button>
        </> : <form className="auth-form" onSubmit={(event) => {
          event.preventDefault(); setBusy(true); setSaveError("");
          void onSave(name, type).then((message) => setSaveError(message ?? "")).finally(() => setBusy(false));
        }}>
          {saveError && <p className="auth-error" role="alert">{saveError}</p>}
          <label>Display name<input value={name} maxLength={80} autoComplete="name" required disabled={busy}
            onChange={(event) => { setEdited(true); setName(event.target.value); }} /></label>
          <fieldset className="profile-account-types" disabled={busy}><legend>Account type</legend>
            {(["personal", "business"] as const).map((value) => <label key={value}>
              <input type="radio" name="accountType" checked={type === value} onChange={() => setType(value)} />
              {value === "personal" ? "Personal" : "Business"}
            </label>)}
          </fieldset>
          <button className="sign-in-button" disabled={busy}>{busy ? "Saving…" : "Continue"}</button>
        </form>}
        <button type="button" className="auth-link" onClick={onSignOut} disabled={busy}>Sign out</button>
      </div>
    </section>
  </main>;
}
