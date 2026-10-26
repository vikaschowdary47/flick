"use client";
import { useEffect, useState } from "react";
import { BrandLockup } from "../../../components/brand-lockup";

// Sign-in hand-off: Google/Apple/email confirmation land here in the browser,
// and this page passes the result on to the eqlShare app (eqlshare://), so the
// browser tab doesn't sit frozen on the Google page.
export default function AuthCallback() {
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const failure = params.get("error_description") || hash.get("error_description");
    if (failure) {
      setError(failure.replace(/\+/g, " "));
      return;
    }
    const url = `eqlshare://auth-callback${window.location.search}${window.location.hash}`;
    setAppUrl(url);
    window.location.href = url;
  }, []);

  return (
    <main className="legal-page wrap auth-handoff">
      <div className="legal-card">
        <BrandLockup />
        {error ? (
          <>
            <h1>Sign-in didn&apos;t finish.</h1>
            <p className="legal-lede">{error}</p>
            <p>Go back to eqlShare and try again. If it keeps happening, email <a href="mailto:support@eqlshare.com">support@eqlshare.com</a>.</p>
          </>
        ) : (
          <>
            <h1>You&apos;re signed in.</h1>
            <p className="legal-lede">Taking you back to eqlShare. You can close this tab.</p>
            {appUrl && <a className="primary-button" href={appUrl}>Open eqlShare <span>↗</span></a>}
            <p>Nothing happened? Make sure eqlShare is installed and open, then click the button.</p>
          </>
        )}
      </div>
    </main>
  );
}
