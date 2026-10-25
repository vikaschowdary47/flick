// Every color in the app lives here, as named tokens per theme and appearance.
// Components read the active palette with useTheme() (src/design/ThemeProvider.tsx).
// Sizes, radii, fonts and springs stay in tokens.ts.

import { themeColors } from "../../../shared/themeColors";

export type ThemeName = "playful" | "classy";
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

export const palettes: Record<ThemeName, Record<ColorScheme, Palette>> = {
  playful: { light: playfulLight, dark: playfulDark },
  classy: { light: classyLight, dark: classyDark },
};
