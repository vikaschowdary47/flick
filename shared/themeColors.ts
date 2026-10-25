export const themeColors = {
  primary: "#F5B83D",
  onPrimary: "#2B2210",
  background: "#FFF8EE",
  darkBackground: "#1F2937",
  text: "#2B2210",
  muted: "#6B6F8A",
  coral: "#F67381",
  yellow: "#FFD66B",
  mint: "#8EE3C8",
  lilac: "#C9B8FF",
} as const;

export type ThemeColors = typeof themeColors;
