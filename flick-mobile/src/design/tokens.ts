// Flick design tokens for React Native. Values come from DESIGN.md "Tokens".
// RN uses unitless numbers (density-independent points), not "px" strings.

// Colors live in theme.ts (per theme and light/dark).

const radii = {
  window: 24,
  card: 16,
  thumbnail: 10,
  pill: 9999,
} as const;

// Font family names registered by @expo-google-fonts/hanken-grotesk (redesign v2).
// In RN each weight is its own family, so pick the family instead of fontWeight.
// The key names are kept from the Nunito era so every screen picks up the new
// face without changes: "semibold" is body text, "extrabold" is titles.
const fonts = {
  regular: "HankenGrotesk_400Regular",
  semibold: "HankenGrotesk_500Medium",
  extrabold: "HankenGrotesk_600SemiBold",
  mono: "Menlo", // HTML source in the iPhone viewer (built into iOS)
} as const;

const fontSizes = {
  wordmark: 24,
  heading: 28,
  cardTitle: 16,
  meta: 13,
  eyebrow: 14, // section labels, sentence case
  body: 16,
  button: 17,
} as const;

const letterSpacing = {
  eyebrow: 0, // v2: no tracked-out caps
  heading: -0.4,
} as const;

// v2: 1pt hairlines instead of 2pt sticker outlines.
const borderWidth = {
  outline: 1,
} as const;

// v2 has no sticker shadows: depth comes from hairlines and surface color.
// The keys stay so existing styles keep working; both are now "no shadow".
const shadows = {
  sticker: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  stickerPressed: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// Same values as the desktop Framer Motion springs, for Reanimated withSpring().
const springs = {
  newCard: { stiffness: 420, damping: 24, mass: 0.8 },
  removeCard: { stiffness: 500, damping: 28, mass: 0.7 },
  press: { stiffness: 460, damping: 30, mass: 0.8 },
} as const;

const motion = {
  maxDurationMs: 380,
  // v2: cards sit straight (the old sticker tilt is off).
  cardTiltMinDeg: 0,
  cardTiltMaxDeg: 0,
  removeSpinDeg: 8,
} as const;

const layout = {
  minTouchTarget: 44,
  logoMark: 32,
  thumbnail: 44,
  cardGap: 12,
  screenPadding: 20,
  flickButtonHeight: 56,
  sendButton: 72, // round send button in the dock
  inputHeight: 52,
  signInMark: 56,
  statusDot: 8,
  iconSize: 20,
  menuWidth: 220,
} as const;

// Compact density: rows, image grid and chips (Comfy uses the values above).
// Heights are fixed so long lists can skip measuring (getItemLayout).
const compact = {
  padding: 10,
  icon: 28,
  title: 14,
  meta: 12,
  gap: 6,
  rowHeight: 52,
  gridColumns: 3,
  chipHeight: 36,
  sectionHeaderHeight: 30,
  moreChipHeight: 32,
  iconRadius: 9,
  tabHeight: 32,
  headingFadeDistance: 48, // scroll distance over which the big heading fades
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const tokens = {
  radii,
  fonts,
  fontSizes,
  letterSpacing,
  borderWidth,
  shadows,
  springs,
  motion,
  layout,
  spacing,
  compact,
} as const;

export type Tokens = typeof tokens;
