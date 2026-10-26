import type { Metadata } from "next";
import { BrandLockup } from "../components/brand-lockup";
import { DEFAULT_DESCRIPTION, pageMetadata } from "../lib/seo";
import { StructuredData } from "../components/structured-data";

export const metadata: Metadata = pageMetadata({ description: DEFAULT_DESCRIPTION, path: "/" });
import { DeviceDemo } from "../components/device-demo";
import { FAQ } from "../components/faq";
import { SiteFooter } from "../components/site-footer";
import { WaitlistForm } from "../components/waitlist-form";
import { AuthCodeForwarder } from "../components/auth-code-forwarder";

// Simple line icons (were text glyphs, which render differently per system).
const ICON_PATHS: Record<string, string> = {
  devices: "M3 5.5h11a1.5 1.5 0 0 1 1.5 1.5v7H1.5V7A1.5 1.5 0 0 1 3 5.5ZM.5 17h15M18 8.5h3.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  clock: "M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM12 7.5V12l3 2",
  clip: "M8 4.5H7A2.5 2.5 0 0 0 4.5 7v11.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 17 4.5h-1M9 3h6v3H9zM9 11h6M9 15h4",
  share: "M12 15V3.5M7.5 8 12 3.5 16.5 8M8 11H6.5A2.5 2.5 0 0 0 4 13.5v5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-5a2.5 2.5 0 0 0-2.5-2.5H16",
  drag: "M7 7h10v10M17 7 6 18",
  lock: "M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5ZM8 10.5V8a4 4 0 1 1 8 0v2.5",
};

// Things people actually move between devices, for the strip under the hero.
const MARQUEE = [
  { kind: "img", label: "lake-sunset.jpg" },
  { kind: "pdf", label: "Invoice-2026-1043.pdf" },
  { kind: "clip", label: "npm run dev" },
  { kind: "img", label: "floor-plan-v2.png" },
  { kind: "link", label: "figma.com/file/brand" },
  { kind: "doc", label: "pitch-deck.key" },
  { kind: "clip", label: "Wi-Fi: Studio_5G" },
  { kind: "img", label: "receipt-scan.jpg" },
  { kind: "doc", label: "voice-memo.m4a" },
  { kind: "link", label: "maps.app/dinner" },
];

function FeatureIcon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export default function Home() {
  return (
    <main>
      <StructuredData />
      <AuthCodeForwarder />
      <nav className="nav wrap">
        <a className="brand" href="#top">
          <BrandLockup />
        </a>
        <a className="nav-link" href="#waitlist">
          Get early access
        </a>
      </nav>
      <section className="hero-v3" id="top">
        <div className="hero-v3-copy wrap">
          <a className="hero-badge" href="#waitlist">
            <i aria-hidden="true" />
            Early access is open
            <span aria-hidden="true">→</span>
          </a>
          <h1>
            It’s on your phone.
            <br />
            Now it’s{" "}
            <span className="hero-here">
              here.
              <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 17 C 70 6, 150 4, 296 12" />
              </svg>
            </span>
          </h1>
          <p className="hero-sub">
            Send a photo, file or clip from one device and pick it up on the
            others. It stays for 24&nbsp;hours, then it’s gone.
          </p>
          <WaitlistForm />
          <div className="platforms">
            <span>Coming soon to</span>
            <b>iOS</b>
            <b>Android</b>
            <b>Mac</b>
            <b>Windows</b>
          </div>
        </div>
        <div className="hero-stage wrap">
          <DeviceDemo />
        </div>
        <div className="hero-marquee" aria-hidden="true">
          <div className="hero-marquee-track">
            {[0, 1].map((copy) => (
              <div className="hero-marquee-set" key={copy}>
                {MARQUEE.map((item) => (
                  <span key={item.label}><i className={`kind-${item.kind}`} />{item.label}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="intro-section wrap">
        <div className="section-label">How it works</div>
        <div className="intro-heading">
          <h2>
            Send it over.
            <br />
            Get on with it.
          </h2>
          <p>
            One tiny place for everything you want to move between your devices.
            No cables. No awkward emailing yourself.
          </p>
        </div>
        <div className="steps">
          <div>
            <strong>01</strong>
            <span className="step-icon" aria-hidden="true"><FeatureIcon name="share" /></span>
            <h3>Upload anywhere</h3>
            <p>Drop a photo, file or clip from any device.</p>
          </div>
          <div>
            <strong>02</strong>
            <span className="step-icon" aria-hidden="true"><FeatureIcon name="devices" /></span>
            <h3>It appears everywhere</h3>
            <p>Your stuff pops up in your desktop widget.</p>
          </div>
          <div>
            <strong>03</strong>
            <span className="step-icon" aria-hidden="true"><FeatureIcon name="drag" /></span>
            <h3>Drag it into anything</h3>
            <p>Pick it up and keep moving. That simple.</p>
          </div>
        </div>
      </section>
      <section className="features-section">
        <div className="wrap">
          <div className="section-label">Why eqlShare</div>
          <div className="feature-heading">
            <h2>
              Small tool.
              <br />
              Big relief.
            </h2>
            <p>Built for the five seconds between “I need that file” and “got it”.</p>
          </div>
          <div className="bento">
            <article className="bento-card bento-wide bento-fuse">
              <div className="bento-text">
                <h3>Gone in 24 hours</h3>
                <p>Files delete themselves after a day unless you pin them, so nothing piles up.</p>
              </div>
              <div className="fuse-demo" aria-hidden="true">
                <div className="fuse-file"><span className="fuse-thumb" /><span><b>lake-sunset.jpg</b><small>Expires in 23 h</small></span></div>
                <div className="fuse-track"><i /></div>
                <div className="fuse-scale"><span>Sent</span><span>12 h</span><span>Gone</span></div>
              </div>
            </article>
            <article className="bento-card">
              <div className="bento-text">
                <h3>Every device</h3>
                <p>Phone to laptop, Android to Mac. Everything plays nicely together.</p>
              </div>
              <ul className="device-list" aria-label="Supported devices">
                <li><i />iPhone</li>
                <li><i />Android</li>
                <li><i />Mac</li>
                <li><i />Windows</li>
              </ul>
            </article>
            <article className="bento-card">
              <div className="bento-text">
                <h3>Clips</h3>
                <p>Send text and links between devices. Your laptop remembers recent clips too.</p>
              </div>
              <div className="clip-demo" aria-hidden="true">
                <div><code>npm run dev</code><span>Copy</span></div>
                <div className="copied"><b>Wi-Fi: Studio_5G</b><span>Copied</span></div>
              </div>
            </article>
            <article className="bento-card">
              <div className="bento-text">
                <h3>Share by link</h3>
                <p>Send a link to friends and teams. No phone numbers needed.</p>
              </div>
              <div className="link-demo" aria-hidden="true">
                <span>eqlshare.com/d/k3x9q</span>
                <b>Copy link</b>
              </div>
            </article>
            <article className="bento-card">
              <div className="bento-text">
                <h3>Share from anywhere</h3>
                <p>Send from your phone’s share sheet without breaking your flow.</p>
              </div>
              <div className="sheet-demo" aria-hidden="true">
                <span>Messages</span>
                <span>Mail</span>
                <span className="on">eqlShare</span>
                <span>Notes</span>
              </div>
            </article>
            <article className="bento-card bento-full bento-private">
              <h3>Private by design</h3>
              <ul>
                <li>Encrypted</li>
                <li>Temporary by default</li>
                <li>No ads, no tracking</li>
              </ul>
            </article>
          </div>
        </div>
      </section>
      <section className="faq-section wrap">
        <div className="section-label">Questions</div>
        <div className="faq-layout">
          <h2>
            Good to
            <br />
            know.
          </h2>
          <FAQ />
        </div>
      </section>
      <section className="cta-section wrap" id="waitlist">
        <h2>Be first in line.</h2>
        <p>
          Join the tiny list of people who like their files where they need
          them.
        </p>
        <WaitlistForm compact />
        <span className="cta-note">
          No spam. Just a heads-up when we launch.
        </span>
      </section>
      <SiteFooter />
    </main>
  );
}
