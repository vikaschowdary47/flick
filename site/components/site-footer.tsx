import Link from "next/link";
import { BrandMark } from "./brand-mark";
export function SiteFooter() { return <footer className="footer"><div className="footer-brand"><BrandMark size={31}/><span>eqlShare</span></div><p>Sharing, equally.</p><nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@eqlshare.com">hello@eqlshare.com</a></nav><small>© {new Date().getFullYear()} eqlShare</small></footer>; }
