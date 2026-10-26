import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link-preview image (LinkedIn, X, iMessage, Reddit...), in the v2 look.
// Built at build time from local files only: the bundled Hanken Grotesk and
// inline shapes, so it can't fail to load.
export const alt = "eqlShare: It's on your phone. Now it's here. Send files between your phone and laptop.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AMBER = "#F5B83D";
const INK = "#1A1712";
const MUTED = "#5E5A52";
const CANVAS = "#F3F2EF";

async function font(weight: 500 | 600) {
  return readFile(join(process.cwd(), `node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-${weight}-normal.woff`));
}

export default async function Image() {
  const [medium, semibold] = await Promise.all([font(500), font(600)]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: CANVAS, color: INK, fontFamily: "Hanken Grotesk", padding: "72px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 1024 1024">
              <rect width="1024" height="1024" rx="230" fill={AMBER} />
              <rect x="221" y="189" width="583" height="126" rx="63" fill="#2B2210" />
              <polygon points="260,433 764,433 512,772" fill="#2B2210" stroke="#2B2210" strokeWidth="79" strokeLinejoin="round" />
            </svg>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>
              <span style={{ color: "#8A8173" }}>eql</span>
              <span>Share</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 600, lineHeight: 1.04, letterSpacing: -2.6 }}>
            <span>It’s on your phone.</span>
            <span>Now it’s here.</span>
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: MUTED }}>
            Phone to laptop in seconds. Gone in 24 hours.
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 330, padding: 18, borderRadius: 26, background: "#FFFFFF", boxShadow: "0 0 0 2px rgba(26,23,18,0.08)" }}>
            <div style={{ display: "flex", height: 190, borderRadius: 18, background: "linear-gradient(180deg, #F6D7B0 0%, #F2B98A 50%, #8A5E64 80%, #3B3040 100%)" }} />
            <div style={{ display: "flex", flexDirection: "column", padding: "16px 6px 10px" }}>
              <span style={{ fontSize: 24, fontWeight: 600 }}>lake-sunset.jpg</span>
              <span style={{ fontSize: 19, fontWeight: 500, color: MUTED, marginTop: 4 }}>Landed on your Mac</span>
            </div>
            <div style={{ display: "flex", height: 6, borderRadius: 3, background: AMBER, margin: "4px 6px 4px" }} />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Hanken Grotesk", data: medium, weight: 500, style: "normal" },
        { name: "Hanken Grotesk", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
