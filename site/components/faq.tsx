import Link from "next/link";
import type { ReactNode } from "react";

const faqs: [string, ReactNode][] = [
  ["Is it free?", "Yes. The free plan is built for everyday sharing. A Pro plan with more space and team features is coming later."],
  ["Which platforms does eqlShare support?", "iPhone, Android, Mac and Windows. Send from one device and pick it up on any of the others."],
  ["How big can files be?", "On the free plan: up to 50 MB per file, 500 MB in total, 3 pinned files and 4 devices."],
  ["When does it launch?", "We're putting the finishing touches on it now. Join the waitlist and we'll email you when the apps are ready."],
  ["Is my data private?", <>Files are encrypted in transit and at rest, and deleted automatically after 24 hours unless you pin them. No ads, no tracking, and we never sell your data. <Link href="/privacy">Read the privacy policy</Link>.</>],
  ["How is it different from AirDrop?", "eqlShare works across iPhone, Android, Mac and Windows, and you can share with friends and teams by link, without swapping phone numbers."],
  ["How do I delete my account?", <>In the app, open Settings and choose Delete account. <Link href="/delete-account">More options</Link>.</>],
];

export function FAQ() {
  return (
    <div className="faq-list">
      {faqs.map(([q, a]) => (
        <details key={q}>
          <summary>{q}<span>+</span></summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
