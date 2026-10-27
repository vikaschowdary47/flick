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
        <p className="legal-lede">You can delete your eqlShare account and everything in it at any time. It takes a few seconds and can&apos;t be undone. You can also delete some of your data and keep your account.</p>

        <h2>In the app (fastest)</h2>
        <p><strong>iPhone and Android</strong></p>
        <ol>
          <li>Open eqlShare and tap the gear icon at the top right to open Settings.</li>
          <li>Scroll to the bottom, tap <em>Delete account…</em>, type DELETE to confirm, then tap <em>Permanently delete account</em>.</li>
        </ol>
        <p><strong>Mac and Windows</strong></p>
        <ol>
          <li>Click the eqlShare icon in the menu bar (Mac) or system tray (Windows), then the gear icon.</li>
          <li>Click <em>Delete account…</em>, type DELETE to confirm, then click <em>Permanently delete account</em>.</li>
        </ol>

        <h2>Without the app</h2>
        <p>Email <a href={`mailto:${SUPPORT}?subject=Delete%20my%20eqlShare%20account`}>{SUPPORT}</a> from the email address on your account with the subject &ldquo;Delete my eqlShare account&rdquo;. We&apos;ll confirm it&apos;s you, delete the account within 7 days, and reply when it&apos;s done.</p>

        <h2>What gets deleted</h2>
        <ul>
          <li>Your account, sign-in details and profile (display name, personal or business choice).</li>
          <li>All your files, photos, previews and clips, on our servers and on your signed-in devices.</li>
          <li>Your share links (they stop working immediately), devices and settings.</li>
        </ul>

        <h2>What may be kept, and for how long</h2>
        <ul>
          <li>Encrypted backups and basic server logs, kept by us and our hosting provider for up to 30 days for security and abuse prevention, then overwritten.</li>
          <li>Records the law requires us to keep, only for as long as it requires.</li>
        </ul>

        <h2 id="delete-data">Delete some of your data and keep your account</h2>
        <ul>
          <li><strong>A file or clip:</strong> tap it in the app and choose <em>Remove</em>. It&apos;s deleted from our servers and from all your devices.</li>
          <li><strong>Everything you send</strong> is deleted automatically 24 hours after upload, unless you pin it.</li>
          <li><strong>A device:</strong> sign out on that device and it&apos;s removed from your account.</li>
          <li><strong>Clipboard history on a Mac or PC:</strong> open Settings and choose <em>Clear</em>. It&apos;s stored only on that computer.</li>
          <li><strong>Anything else</strong> (for example your display name or a waitlist email): email <a href={`mailto:${SUPPORT}?subject=Delete%20my%20eqlShare%20data`}>{SUPPORT}</a> from your account email with the subject &ldquo;Delete my eqlShare data&rdquo;. We&apos;ll do it within 30 days.</li>
        </ul>
        <p>Data deleted this way may stay in backups and logs for up to 30 days, then it&apos;s removed.</p>

        <p>More detail is in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </article>
    </main>
  );
}
