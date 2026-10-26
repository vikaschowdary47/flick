import type { Metadata } from "next";
// Redesign v2: Hanken Grotesk, bundled locally (no build-time Google Fonts fetch).
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "./globals.css";
import "./share.css";
import "./theme.css";
import "./brand.css";
import "./v2.css";
export const metadata: Metadata = { metadataBase: new URL("https://www.eqlshare.com"), title: { default: "eqlShare — sharing, equally.", template: "%s · eqlShare" }, description: "Move files, photos and clips between all your devices instantly.", alternates: { canonical: "https://www.eqlshare.com" }, openGraph: { title: "eqlShare — sharing, equally.", description: "One tiny place for everything you want to move between your devices.", url: "https://www.eqlshare.com", siteName: "eqlShare", type: "website" }, twitter: { card: "summary_large_image", title: "eqlShare — sharing, equally.", description: "Move files, photos and clips between all your devices instantly." }, icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
