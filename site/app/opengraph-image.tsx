import { ImageResponse } from "next/og";

// Link-preview image (LinkedIn, X, iMessage, Reddit...). Everything is drawn
// inline: no external images or fonts, so it can't fail to load.
export const alt = "eqlShare: your files, everywhere.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MUSTARD = "#F5B83D";
const INK = "#2B2210";
const CREAM = "#FFF8EE";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", background: CREAM, color: INK, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, top: -120, width: 420, height: 420, borderRadius: 9999, background: MUSTARD, opacity: 0.35, display: "flex" }} />
        <div style={{ position: "absolute", right: 140, bottom: -160, width: 320, height: 320, borderRadius: 9999, background: "#8EE3C8", opacity: 0.35, display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="88" height="88" viewBox="0 0 1024 1024">
            <rect width="1024" height="1024" rx="230" fill={MUSTARD} />
            <rect x="221" y="189" width="583" height="126" rx="63" fill={INK} />
            <polygon points="260,433 764,433 512,772" fill={INK} stroke={INK} strokeWidth="79" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ color: "#8A8173" }}>eql</span>
            <span>Share</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: 1, marginTop: 56, letterSpacing: -4 }}>
          <span>Your files,</span>
          <span style={{ display: "flex" }}>
            <span style={{ background: MUSTARD, padding: "0 12px", borderRadius: 10 }}>everywhere.</span>
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 34, color: "#6B6F8A" }}>Phone, Mac and Windows. Shared in a tap.</div>
      </div>
    ),
    size,
  );
}
