import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "What eqlShare collects, why, how long we keep it, and how to delete it.",
  path: "/privacy",
});

const SUPPORT = "support@eqlshare.com";

export default function Privacy() {
  return (
    <main className="legal-page wrap">
      <Link className="back-link" href="/">← Back to eqlShare</Link>
      <article className="legal-card">
        <span className="kicker">eqlShare / privacy</span>
        <h1>Privacy, plainly.</h1>
        <p className="legal-lede">eqlShare moves your files between your devices. We collect only what that needs, we delete it quickly, and we never sell it.</p>
        <p><strong>Last updated: October 25, 2026</strong></p>

        <h2>The short version</h2>
        <ul>
          <li>Files and clips you send are deleted automatically 24 hours after upload, unless you pin them.</li>
          <li>We don&apos;t show ads, we don&apos;t use analytics or tracking tools in our apps, and we don&apos;t sell or rent your data.</li>
          <li>We only read your clipboard when you tap <em>Send clipboard</em>.</li>
          <li>You can delete your account and everything in it from the app at any time.</li>
        </ul>

        <h2>Who we are</h2>
        <p>eqlShare (&ldquo;we&rdquo;, &ldquo;us&rdquo;) makes the eqlShare apps for iPhone, Android, Mac and Windows and runs eqlshare.com. Questions about this policy go to <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</p>

        <h2>What we collect</h2>
        <p><strong>Your account.</strong> Your email address and how you sign in (email and password, Google or Apple). If you use Google or Apple, we receive the name and email they share with us. You can also set a display name and tell us whether you use eqlShare for personal or business use. Passwords are handled by our sign-in provider and are never visible to us.</p>
        <p><strong>What you send.</strong> The files, photos, text and links you upload, their names, sizes and types, and when they were sent. For photos we also store a small preview image so your other devices can show a thumbnail.</p>
        <p><strong>Your devices.</strong> The name of each device you sign in on (which you can rename), its type (for example iPhone or Windows), when it was last active, and your widget preferences. This lets your files show up on the right devices and enforces the device limit on your plan.</p>
        <p><strong>Your settings.</strong> Choices like clipboard sharing on or off, layout density, and your plan.</p>
        <p><strong>Share links.</strong> When you share a file by link, we store the link&apos;s expiry time and a scrambled (hashed) copy of the link ID, plus a short-lived counter used to stop abuse.</p>
        <p><strong>Waitlist.</strong> If you join the waitlist on our website, we store your email, whether you chose personal or team, and how you found us (for example a referral tag in the link).</p>
        <p><strong>Messages to us.</strong> If you email support, we keep that conversation so we can help you.</p>

        <h2>What we don&apos;t collect</h2>
        <ul>
          <li>No advertising IDs, analytics or tracking tools in the apps.</li>
          <li>No location, contacts or microphone access.</li>
          <li>Your clipboard is read only when you tap <em>Send clipboard</em>. On laptops, your recent clipboard history is kept on that computer only, unless you choose to sync a clip.</li>
          <li>Camera and photo library access is used only when you choose to take or pick a photo to send.</li>
        </ul>

        <h2>How we use it</h2>
        <p>To run eqlShare: sign you in, deliver what you send to your devices or share links, show your usage against your plan&apos;s limits, send account emails (like confirming your email or resetting your password), keep the service secure and prevent abuse, and answer your questions. We use waitlist emails only to tell you about eqlShare&apos;s launch and major updates.</p>

        <h2>How long we keep it</h2>
        <ul>
          <li><strong>Files and clips:</strong> deleted automatically 24 hours after upload. Pinned files stay until you unpin them (then the 24 hours start again) or delete them. Deleting a file removes it, and its preview, from every device.</li>
          <li><strong>Share links:</strong> stop working when they expire or when you revoke them, and are removed with the file.</li>
          <li><strong>Account, device and settings data:</strong> kept while you have an account, and deleted when you delete your account.</li>
          <li><strong>Waitlist:</strong> kept until launch updates are no longer relevant, or until you ask us to remove you.</li>
          <li><strong>Backups:</strong> our hosting provider may keep encrypted backups for a short period before they are overwritten.</li>
        </ul>

        <h2>Who we share it with</h2>
        <p>We never sell your data or share it for advertising. We use a small number of service providers to run eqlShare, and they may only use your data to provide their service to us:</p>
        <ul>
          <li><strong>Supabase</strong>: database, file storage and sign-in (servers in the United States).</li>
          <li><strong>Resend</strong>: sends account emails such as sign-up confirmation and password reset.</li>
          <li><strong>Vercel</strong> and <strong>Cloudflare</strong>: host and deliver our website.</li>
          <li><strong>Google</strong> and <strong>Apple</strong>: only if you choose to sign in with them.</li>
        </ul>
        <p>Anyone you send a share link to can download that file until the link expires. We may also disclose information if the law requires it, or to protect people from harm.</p>

        <h2>How we protect it</h2>
        <p>Everything travels over encrypted connections (HTTPS/TLS) and is encrypted at rest by our storage provider. Access rules make sure your files and data can only be reached by your own signed-in account, or by someone holding a share link you created. eqlShare does not currently offer end-to-end encryption; we&apos;ll say so clearly here if that changes.</p>

        <h2>Your choices and rights</h2>
        <ul>
          <li><strong>Delete your account:</strong> in the app, open Settings and choose <em>Delete account</em>. This removes your account, files, clips, devices and settings. <Link href="/delete-account">Steps and other options</Link>.</li>
          <li><strong>Delete a file:</strong> tap or click &times; on it at any time.</li>
          <li><strong>Access or correct your data, or leave the waitlist:</strong> email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</li>
        </ul>
        <p>Depending on where you live (for example in the EU, UK or California), you may have rights to access, correct, delete or export your data, and to object to or restrict how it&apos;s used. Email us and we&apos;ll respond within 30 days. You can also complain to your local data protection authority.</p>

        <h2>Children</h2>
        <p>eqlShare isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data. If you think a child has given us information, email us and we&apos;ll delete it.</p>

        <h2>Where your data is stored</h2>
        <p>Your data is stored and processed in the United States. If you use eqlShare from elsewhere, your data is transferred there.</p>

        <h2>Changes</h2>
        <p>If we change this policy, we&apos;ll update the date above. For important changes, we&apos;ll tell you in the app or by email before they take effect.</p>

        <h2>Contact</h2>
        <p>Email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a> with any question about your privacy.</p>
      </article>
    </main>
  );
}
