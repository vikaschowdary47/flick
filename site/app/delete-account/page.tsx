import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Delete your account",
  description: "How to delete your eqlShare account and all of its data.",
  path: "/delete-account",
});

const SUPPORT = "support@eqlshare.com";

export default function DeleteAccount() {
  return (
    <main className="legal-page wrap">
      <Link className="back-link" href="/">← Back to eqlShare</Link>
      <article className="legal-card">
        <span className="kicker">eqlShare / account</span>
        <h1>Delete your account.</h1>
        <p className="legal-lede">You can delete your eqlShare account and everything in it at any time. It takes a few seconds and can&apos;t be undone.</p>

        <h2>In the app (fastest)</h2>
        <p><strong>iPhone and Android</strong></p>
        <ol>
          <li>Open eqlShare and tap your profile icon to open Settings.</li>
          <li>Tap <em>Delete account</em>, type DELETE to confirm, then tap <em>Permanently delete account</em>.</li>
        </ol>
        <p><strong>Mac and Windows</strong></p>
        <ol>
          <li>Click the eqlShare icon in the menu bar (Mac) or system tray (Windows), then your profile icon.</li>
          <li>Click <em>Delete account</em>, type DELETE to confirm, then click <em>Permanently delete account</em>.</li>
        </ol>

        <h2>Without the app</h2>
        <p>Email <a href={`mailto:${SUPPORT}?subject=Delete%20my%20eqlShare%20account`}>{SUPPORT}</a> from the email address on your account with the subject &ldquo;Delete my eqlShare account&rdquo;. We&apos;ll confirm it&apos;s you, delete the account within 7 days, and reply when it&apos;s done.</p>

        <h2>What gets deleted</h2>
        <ul>
          <li>Your account, sign-in details and profile (display name, personal or business choice).</li>
          <li>All your files, photos, previews and clips, on our servers and on your signed-in devices.</li>
          <li>Your share links (they stop working immediately), devices and settings.</li>
        </ul>
        <p>Nothing is kept afterwards, except encrypted backups held briefly by our hosting provider before they&apos;re overwritten, and any records the law requires us to keep. To remove a waitlist email instead, just email us.</p>

        <p>More detail is in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </article>
    </main>
  );
}
