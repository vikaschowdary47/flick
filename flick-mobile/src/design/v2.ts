import { useTheme } from "./ThemeProvider";

// Redesign v2 colours, straight from UI_mockups/v2/eqlShare-v2.html (:root and
// [data-theme="dark"]). Screens built to the v2 design read these so they match
// the mockup exactly, whatever older palette fields say.
export type V2 = {
  canvas: string;
  surface: string;
  fill: string;
  fill2: string;
  ink: string;
  ink2: string;
  ink3: string;
  hair: string;
  edge: string; // the 1px "shadow-1" ring around cards
  amber: string;
  onAmber: string;
  amberDeep: string; // amber text (Done, links)
  liveDot: string;
  danger: string;
  toggleOn: string;
  segOn: string; // selected segment
  tagBg: string;
};

const LIGHT: V2 = {
  canvas: "#F3F2EF",
  surface: "#FFFFFF",
  fill: "rgba(26, 23, 18, 0.06)",
  fill2: "rgba(26, 23, 18, 0.1)",
  ink: "#1A1712",
  ink2: "#5E5A52",
  ink3: "#726D64",
  hair: "rgba(26, 23, 18, 0.12)",
  edge: "rgba(26, 23, 18, 0.08)",
  amber: "#F5B83D",
  onAmber: "#2B2210",
  amberDeep: "#8A5A00",
  liveDot: "#34C46E",
  danger: "#C2384A",
  toggleOn: "#1A1712",
  segOn: "#FFFFFF",
  tagBg: "rgba(20, 18, 14, 0.72)",
};

const DARK: V2 = {
  canvas: "#000000",
  surface: "#161513",
  fill: "rgba(244, 241, 234, 0.07)",
  fill2: "rgba(244, 241, 234, 0.12)",
  ink: "#F4F1EA",
  ink2: "#A8A398",
  ink3: "#8E897F",
  hair: "rgba(244, 241, 234, 0.12)",
  edge: "rgba(255, 255, 255, 0.08)",
  amber: "#F5B83D",
  onAmber: "#2B2210",
  amberDeep: "#F5B83D",
  liveDot: "#34C46E",
  danger: "#FF6B7A",
  toggleOn: "#F5B83D",
  segOn: "#3A3936",
  tagBg: "rgba(20, 18, 14, 0.72)",
};

export function useV2(): V2 {
  const { scheme } = useTheme();
  return scheme === "dark" ? DARK : LIGHT;
}
