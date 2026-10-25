import type { Metadata } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./share.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
export const metadata: Metadata = { metadataBase: new URL("https://eqlshare.com"), title: { default: "eqlShare — sharing, equally.", template: "%s · eqlShare" }, description: "Move files, photos and clips between all your devices instantly.", alternates: { canonical: "https://eqlshare.com" }, openGraph: { title: "eqlShare — sharing, equally.", description: "One tiny place for everything you want to move between your devices.", url: "https://eqlshare.com", siteName: "eqlShare", type: "website" }, twitter: { card: "summary_large_image", title: "eqlShare — sharing, equally.", description: "Move files, photos and clips between all your devices instantly." }, icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${nunito.variable} ${space.variable}`}><body>{children}</body></html>; }
