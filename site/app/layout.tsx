import type { Metadata, Viewport } from "next";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL } from "../lib/seo";
// Redesign v2: Hanken Grotesk, bundled locally (no build-time Google Fonts fetch).
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "./globals.css";
import "./share.css";
import "./theme.css";
import "./brand.css";
import "./v2.css";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s · eqlShare" },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["send files from phone to laptop", "phone to Mac file transfer", "Android to Mac", "AirDrop alternative", "share files between devices", "clipboard sync"],
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#F3F2EF",
  colorScheme: "light",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
