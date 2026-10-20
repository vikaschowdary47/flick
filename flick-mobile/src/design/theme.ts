// Every color in the app lives here, as named tokens per theme and appearance.
// Components read the active palette with useTheme() (src/design/ThemeProvider.tsx).
// Sizes, radii, fonts and springs stay in tokens.ts.

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
  accent: string; // main button ("Flick it")
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
const cream = "#FFF8EE";
const navy = "#1B2140";
const coral = "#F67381";
const yellow = "#FFD66B";
const mint = "#8EE3C8";
const lilac = "#C9B8FF";

const playfulLight: Palette = {
  background: cream,
  card: "#FFFFFF",
  text: navy,
  textMuted: "#6B6F8A",
  outline: navy,
  shadow: navy,
  accent: coral,
  onAccent: navy, // navy on coral, never white (contrast)
  onColor: navy,
  error: coral,
  sendingCard: mint,
  doneCard: lilac,
  imageTile: yellow,
  documentTile: lilac,
  archiveTile: mint,
  fallbackTile: cream,
  pinBadge: yellow,
  connectedPill: mint,
  signedOutPill: cream,
  offlinePill: yellow,
  inverse: navy,
  onInverse: cream,
  inverseAccent: yellow,
  scrim: "rgba(27, 33, 64, 0.35)",
};

// Colored fills keep their light hues so navy text on them stays readable.
const playfulDark: Palette = {
  ...playfulLight,
  background: "#10142A",
  card: "#1B2140",
  text: cream,
  textMuted: "#B8BCD6",
  outline: "#05070F",
  shadow: "#05070F",
  fallbackTile: cream,
  signedOutPill: cream,
  inverse: cream,
  onInverse: navy,
  inverseAccent: "#B4363F",
  scrim: "rgba(0, 0, 0, 0.55)",
};

const classyLight: Palette = {
  background: "#F6F5F2",
  card: "#FFFFFF",
  text: "#1F2329",
  textMuted: "#6A6F78",
  outline: "#1F2329",
  shadow: "#1F2329",
  accent: "#2F3B52",
  onAccent: "#FFFFFF",
  onColor: "#1F2329",
  error: "#B3443F",
  sendingCard: "#DCE7E2",
  doneCard: "#E3E0EE",
  imageTile: "#EFE6D2",
  documentTile: "#E3E0EE",
  archiveTile: "#DCE7E2",
  fallbackTile: "#F6F5F2",
  pinBadge: "#EFE6D2",
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
  background: "#121315",
  card: "#1D1F23",
  text: "#EEEEEC",
  textMuted: "#A3A7AE",
  outline: "#000000",
  shadow: "#000000",
  accent: "#B9C6DE",
  onAccent: "#121315",
  inverse: "#EEEEEC",
  onInverse: "#121315",
  inverseAccent: "#7A5C12",
  scrim: "rgba(0, 0, 0, 0.55)",
};

export const palettes: Record<ThemeName, Record<ColorScheme, Palette>> = {
  playful: { light: playfulLight, dark: playfulDark },
  classy: { light: classyLight, dark: classyDark },
};
