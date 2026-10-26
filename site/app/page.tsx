import { BrandLockup } from "../components/brand-lockup";
import { DeviceDemo } from "../components/device-demo";
import { FAQ } from "../components/faq";
import { SiteFooter } from "../components/site-footer";
import { WaitlistForm } from "../components/waitlist-form";
import { AuthCodeForwarder } from "../components/auth-code-forwarder";

const features = [
  [
    "↗",
    "Cross-platform",
    "Phone to laptop, Android to Mac. Everything plays nicely together.",
  ],
  [
    "⌁",
    "Share by link",
    "Send a link to friends and teams. No phone numbers needed.",
  ],
  [
    "◷",
    "Gone in 24h",
    "Files delete themselves after a day unless you pin them, so nothing piles up.",
  ],
  [
    "✦",
    "Clips",
    "Send text and links between devices. Your laptop remembers recent clips too.",
  ],
  [
    "↥",
    "Share from anywhere",
    "Send from your phone's share sheet without breaking your flow.",
  ],
  [
    "◌",
    "Private by design",
    "Encrypted, temporary by default, no ads and no tracking. Your stuff stays yours.",
  ],
];
export default function Home() {
  return (
    <main>
      <AuthCodeForwarder />
      <nav className="nav wrap">
        <a className="brand" href="#top">
          <BrandLockup />
        </a>
        <a className="nav-link" href="#waitlist">
          Get early access <span> ↗ </span>
        </a>
      </nav>
      <section className="hero wrap" id="top">
        <div className="hero-copy">
          <div className="kicker">
            <span className="spark">✦</span> the easy way to move stuff
          </div>
          <h1>
            Your files,
            <br />
            <em>everywhere.</em>
          </h1>
          <p className="hero-sub">
            eqlShare moves photos, clips and files between all your devices —
            instantly, equally, effortlessly.
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
        <DeviceDemo />
      </section>
      <section className="intro-section wrap">
        <div className="section-label">01 / how it works</div>
        <div className="intro-heading">
          <h2>
            Send it over.
            <br />
            <span>Get on with it.</span>
          </h2>
          <p>
            One tiny place for everything you want to move between your devices.
            No cables. No awkward emailing yourself.
          </p>
        </div>
        <div className="steps">
          <div>
            <strong>01</strong>
            <span className="step-icon coral">↑</span>
            <h3>Upload anywhere</h3>
            <p>Drop a photo, file or clip from any device.</p>
          </div>
          <div>
            <strong>02</strong>
            <span className="step-icon yellow">✦</span>
            <h3>It appears everywhere</h3>
            <p>Your stuff pops up in your desktop widget.</p>
          </div>
          <div>
            <strong>03</strong>
            <span className="step-icon mint">↘</span>
            <h3>Drag it into anything</h3>
            <p>Pick it up and keep moving. That simple.</p>
          </div>
        </div>
      </section>
      <section className="features-section">
        <div className="wrap">
          <div className="section-label">02 / why eqlShare</div>
          <div className="feature-heading">
            <h2>
              Small tool.
              <br />
              <em>Big relief.</em>
            </h2>
            <p>Designed for the little moments that should be effortless.</p>
          </div>
          <div className="feature-grid">
            {features.map(([icon, title, text], i) => (
              <article className={`feature-card card-${i}`} key={title}>
                <span className="feature-icon">{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="faq-section wrap">
        <div className="section-label">03 / questions, answered</div>
        <div className="faq-layout">
          <h2>
            Good to
            <br />
            <em>know.</em>
          </h2>
          <FAQ />
        </div>
      </section>
      <section className="cta-section wrap" id="waitlist">
        <div className="cta-sticker">✦</div>
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
