import Link from "next/link";
import { BrandLockup } from "./brand-lockup";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-brand"><BrandLockup /></div>
      <p>Sharing, equally.</p>
      <nav>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/delete-account">Delete account</Link>
        <a href="https://www.instagram.com/eqlshare/" target="_blank" rel="noopener noreferrer" aria-label="eqlShare on Instagram">Instagram</a>
        <a href="mailto:support@eqlshare.com">support@eqlshare.com</a>
      </nav>
      <small>© {new Date().getFullYear()} eqlShare</small>
    </footer>
  );
}
