// Every color in the app lives here, as named tokens per theme and appearance.
// Components read the active palette with useTheme() (src/design/ThemeProvider.tsx).
// Sizes, radii, fonts and springs stay in tokens.ts.

import { themeColors } from "../../../shared/themeColors";

export type ThemeName = "playful" | "classy" | "drop";
export type AppearancePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export type Palette = {
  background: string;
  card: string; // plain card / input surface
  text: string; // text on background and plain cards
  textMuted: string;
  outline: string; // sticker borders
  shadow: string; // flat sticker shadow
  accent: string; // main button ("eqlShare it")
  onAccent: string; // text on the accent
  onColor: string; // text on any colored fill (cards, tiles, pills)
  error: string;
  // Colored fills. Text on them always uses onColor.
  sendingCard: string;
  doneCard: string;
  imageTile: string;
  documentTile: string;
  archiveTile: string;
  fallbackTile: string;
  pinBadge: string;
  dangerFill: string; // Delete in menus
  connectedPill: string;
  signedOutPill: string;
  offlinePill: string;
  // Dark bar (undo toast) and its text.
  inverse: string;
  onInverse: string;
  inverseAccent: string;
  scrim: string; // dims the screen behind menus and sheets
};

// Base hues from DESIGN.md.
const cream = themeColors.background;
const ink = themeColors.text;
const coral = themeColors.coral;
const yellow = themeColors.yellow;
const mint = themeColors.mint;
const lilac = themeColors.lilac;

const playfulLight: Palette = {
  background: cream,
  card: "#FFFFFF",
  text: ink,
  textMuted: "#6B6F8A",
  outline: ink,
  shadow: ink,
  accent: themeColors.primary,
  onAccent: themeColors.onPrimary,
  onColor: ink,
  error: coral,
  sendingCard: mint,
  doneCard: lilac,
  imageTile: yellow,
  documentTile: lilac,
  archiveTile: mint,
  fallbackTile: cream,
  pinBadge: yellow,
  dangerFill: coral,
  connectedPill: mint,
  signedOutPill: cream,
  offlinePill: yellow,
  inverse: ink,
  onInverse: cream,
  inverseAccent: yellow,
  scrim: "rgba(27, 33, 64, 0.35)",
};

// Colored fills keep their light hues so navy text on them stays readable.
const playfulDark: Palette = {
  ...playfulLight,
  background: themeColors.darkBackground,
  card: "#263447",
  text: cream,
  textMuted: "#B8BCD6",
  outline: "#05070F",
  shadow: "#05070F",
  fallbackTile: cream,
  signedOutPill: cream,
  inverse: cream,
  onInverse: ink,
  inverseAccent: themeColors.primary,
  scrim: "rgba(0, 0, 0, 0.55)",
};

const classyLight: Palette = {
  background: "#F6F5F2",
  card: "#FFFFFF",
  text: "#1F2329",
  textMuted: "#6A6F78",
  outline: ink,
  shadow: ink,
  accent: themeColors.primary,
  onAccent: themeColors.onPrimary,
  onColor: ink,
  error: "#B3443F",
  sendingCard: "#DCE7E2",
  doneCard: "#E3E0EE",
  imageTile: "#EFE6D2",
  documentTile: "#E3E0EE",
  archiveTile: "#DCE7E2",
  fallbackTile: "#F6F5F2",
  pinBadge: "#EFE6D2",
  dangerFill: "#F0D9D6",
  connectedPill: "#DCE7E2",
  signedOutPill: "#F6F5F2",
  offlinePill: "#EFE6D2",
  inverse: "#1F2329",
  onInverse: "#F6F5F2",
  inverseAccent: "#E9D9AE",
  scrim: "rgba(31, 35, 41, 0.35)",
};

const classyDark: Palette = {
  ...classyLight,
  background: themeColors.darkBackground,
  card: "#263447",
  text: "#EEEEEC",
  textMuted: "#A3A7AE",
  outline: "#000000",
  shadow: "#000000",
  accent: themeColors.primary,
  onAccent: themeColors.onPrimary,
  inverse: "#EEEEEC",
  onInverse: "#121315",
  inverseAccent: "#7A5C12",
  scrim: "rgba(0, 0, 0, 0.55)",
};

// "Drop" (redesign v2, docs/PLAN_redesign_v2.md): minimal and native.
// Neutral surfaces, hairline edges, amber only for sending. Not offered in Settings yet.
const dropLight: Palette = {
  background: "#F3F2EF",
  card: "#FFFFFF",
  text: "#1A1712",
  textMuted: "#5E5A52", // 6.1:1 on background
  outline: "rgba(26, 23, 18, 0.12)", // hairline
  shadow: "transparent",
  accent: themeColors.primary,
  onAccent: themeColors.onPrimary,
  onColor: "#1A1712",
  error: "#C2384A", // 5.3:1 on white
  sendingCard: "#FFFFFF",
  doneCard: "#FFFFFF",
  imageTile: "#ECEAE5",
  documentTile: "#ECEAE5",
  archiveTile: "#ECEAE5",
  fallbackTile: "#ECEAE5",
  pinBadge: "#FFF3D6",
  dangerFill: "#F6DADD",
  connectedPill: "#E3F1E8",
  signedOutPill: "#ECEAE5",
  offlinePill: "#FFF3D6",
  inverse: "#1A1712",
  onInverse: "#F3F2EF",
  inverseAccent: themeColors.primary,
  scrim: "rgba(26, 23, 18, 0.35)",
};

// Dark fills are dark too, so text on them (onColor) is light.
const dropDark: Palette = {
  background: "#000000",
  card: "#161513",
  text: "#F4F1EA",
  textMuted: "#A8A398", // 7.3:1 on card
  outline: "rgba(244, 241, 234, 0.12)",
  shadow: "transparent",
  accent: themeColors.primary,
  onAccent: themeColors.onPrimary,
  onColor: "#F4F1EA",
  error: "#FF6B7A", // 6.6:1 on card
  sendingCard: "#161513",
  doneCard: "#161513",
  imageTile: "#26251F",
  documentTile: "#26251F",
  archiveTile: "#26251F",
  fallbackTile: "#26251F",
  pinBadge: "#2E2615",
  dangerFill: "#4A2730",
  connectedPill: "#1E3A2A",
  signedOutPill: "#26251F",
  offlinePill: "#2E2615",
  inverse: "#F4F1EA",
  onInverse: "#1A1712",
  inverseAccent: "#8A5A00", // 5.9:1 on the light toast
  scrim: "rgba(0, 0, 0, 0.6)",
};

export const palettes: Record<ThemeName, Record<ColorScheme, Palette>> = {
  playful: { light: playfulLight, dark: playfulDark },
  classy: { light: classyLight, dark: classyDark },
  drop: { light: dropLight, dark: dropDark },
};
