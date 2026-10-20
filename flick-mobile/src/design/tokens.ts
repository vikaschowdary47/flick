// Flick design tokens for React Native. Values come from DESIGN.md "Tokens".
// RN uses unitless numbers (density-independent points), not "px" strings.

// Colors live in theme.ts (per theme and light/dark).

const radii = {
  window: 24,
  card: 20,
  thumbnail: 14,
  pill: 9999,
} as const;

// Font family names registered by @expo-google-fonts/nunito.
// In RN each weight is its own family, so pick the family instead of fontWeight.
const fonts = {
  semibold: "Nunito_600SemiBold",
  extrabold: "Nunito_800ExtraBold",
  mono: "Menlo", // HTML source in the iPhone viewer (built into iOS)
} as const;

const fontSizes = {
  wordmark: 24,
  heading: 28,
  cardTitle: 16,
  meta: 13,
  eyebrow: 13,
  body: 15,
  button: 18,
} as const;

const letterSpacing = {
  eyebrow: 13 * 0.08, // 0.08em at 13px
} as const;

const borderWidth = {
  outline: 2,
} as const;

// Flat sticker shadow: 0 4px 0. iOS uses shadow*, Android uses elevation.
// The color comes from the palette (palette.shadow).
const shadows = {
  sticker: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  stickerPressed: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
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
  cardTiltMinDeg: -1.5,
  cardTiltMaxDeg: 1,
  removeSpinDeg: 8,
} as const;

const layout = {
  minTouchTarget: 44,
  logoMark: 32,
  thumbnail: 52,
  cardGap: 12,
  screenPadding: 20,
  flickButtonHeight: 64,
  inputHeight: 52,
  signInMark: 56,
  statusDot: 8,
  iconSize: 20,
  menuWidth: 220,
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
} as const;

export type Tokens = typeof tokens;
