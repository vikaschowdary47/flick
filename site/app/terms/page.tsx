import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: "The terms for using the eqlShare apps and website, including your account and the files you share.",
  path: "/terms",
});

const SUPPORT = "support@eqlshare.com";

export default function Terms() {
  return (
    <main className="legal-page wrap">
      <Link className="back-link" href="/">← Back to eqlShare</Link>
      <article className="legal-card">
        <span className="kicker">eqlShare / terms</span>
        <h1>Terms of service.</h1>
        <p className="legal-lede">The short version: use eqlShare responsibly, keep your own copies of anything important, and we&apos;ll work hard to keep it useful.</p>
        <p><strong>Last updated: October 27, 2026</strong></p>

        <h2>Agreeing to these terms</h2>
        <p>By creating an account or using eqlShare&apos;s apps or website, you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use eqlShare.</p>

        <h2>Your account</h2>
        <p>You must be at least 13 years old (or the minimum age in your country) to use eqlShare. You&apos;re responsible for your account, for keeping your sign-in details safe, and for everything done with your account and the share links you create. Tell us at <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a> if you think someone else has access to it.</p>

        <h2>Your content</h2>
        <p>You own what you upload. You give us permission to store, process and transmit it only as needed to run eqlShare for you: delivering it to your devices and to people you share links with. We don&apos;t use your content for anything else.</p>
        <p>Some features work only on your own device. The desktop app&apos;s clipboard history is stored on that computer and never uploaded unless you send an item; see the <Link href="/privacy">Privacy Policy</Link>. You can turn it off in Settings. Anything you choose to send from it is your content under these terms.</p>

        <h2>Temporary by design</h2>
        <p>eqlShare is for moving things, not storing them. Files and clips are deleted automatically 24 hours after upload unless pinned, and plans have limits on file size, total storage, pins and devices. eqlShare is not a backup service: keep your own copy of anything important.</p>

        <h2>Acceptable use</h2>
        <p>Don&apos;t use eqlShare to:</p>
        <ul>
          <li>share anything illegal, or content that sexually exploits children;</li>
          <li>share content you don&apos;t have the rights to, or that infringes someone else&apos;s rights;</li>
          <li>send malware, spam, or anything meant to harass, threaten or deceive people;</li>
          <li>try to access other people&apos;s accounts or data, get around plan limits, or disrupt or overload the service;</li>
          <li>copy, resell or reverse engineer the service, except where the law allows it.</li>
        </ul>
        <p>We may remove content or disable share links that break these rules, and report illegal content to the authorities.</p>

        <h2>Plans and payments</h2>
        <p>eqlShare currently has a free plan. If we offer paid plans, their prices and terms will be shown before you buy, and purchases made through the App Store or Google Play are also governed by those stores&apos; terms.</p>

        <h2>Ending your account</h2>
        <p>You can delete your account at any time from the app&apos;s Settings (<Link href="/delete-account">how to delete your account</Link>). We may suspend or close accounts that break these terms or put other users or the service at risk. When an account is deleted, its files and data are deleted too.</p>

        <h2>Changes to eqlShare and these terms</h2>
        <p>eqlShare is new and will change as we learn. We may add, change or remove features. If we make important changes to these terms, we&apos;ll update the date above and tell you in the app or by email before they take effect. Continuing to use eqlShare after that means you accept the new terms.</p>

        <h2>Disclaimers</h2>
        <p>eqlShare is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We work to keep it reliable and secure, but we can&apos;t promise it will always be available, error-free, or that files will never be lost or delayed.</p>

        <h2>Limitation of liability</h2>
        <p>To the extent the law allows, eqlShare is not liable for indirect, incidental or consequential damages, or for lost data or profits, arising from your use of the service. Our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim or US$50. Some places don&apos;t allow these limits, so they may not apply to you.</p>

        <h2>Contact</h2>
        <p>Questions about these terms? Email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</p>
      </article>
    </main>
  );
}
