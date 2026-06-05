// Expo / React Native StyleSheet tokens
// Values mirror packages/ui/src/styles/tokens.css exactly.
// All numeric values are raw numbers (not strings) for StyleSheet.create().

export const nativeGlass = {
  level1: "rgba(255,255,255,0.06)",
  level2: "rgba(255,255,255,0.10)",
  level3: "rgba(255,255,255,0.16)",
  level4: "rgba(255,255,255,0.22)",
  specular1: "rgba(255,255,255,0.25)",
  specular2: "rgba(255,255,255,0.30)",
  specular3: "rgba(255,255,255,0.35)",
  specular4: "rgba(255,255,255,0.40)",
  border: "rgba(255,255,255,0.12)",
  borderStrong: "rgba(255,255,255,0.20)",
  borderSubtle: "rgba(255,255,255,0.06)",
} as const

export const nativeColors = {
  background: "#000000",
  backgroundElevated: "#0a0a0a",
  text1: "rgba(255,255,255,0.95)",
  text2: "rgba(255,255,255,0.65)",
  text3: "rgba(255,255,255,0.35)",
  text4: "rgba(255,255,255,0.15)",
  accent: "#FFFFFF",
} as const

export const nativeRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  card: 20,
  panel: 24,
  sheet: 32,
  phone: 44,
  pill: 100,
} as const

export const nativeSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const

// HIG typography — numeric sizes for StyleSheet
export const nativeText = {
  largeTitle: { fontSize: 34, fontWeight: "700", letterSpacing: -0.5 },
  title1: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  title2: { fontSize: 22, fontWeight: "700", letterSpacing: -0.35 },
  title3: { fontSize: 20, fontWeight: "600", letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: "400", letterSpacing: -0.2 },
  callout: { fontSize: 16, fontWeight: "400", letterSpacing: -0.15 },
  subheadline: { fontSize: 15, fontWeight: "400", letterSpacing: -0.15 },
  footnote: { fontSize: 13, fontWeight: "400", letterSpacing: -0.1 },
  caption1: { fontSize: 12, fontWeight: "400", letterSpacing: -0.05 },
  caption2: { fontSize: 11, fontWeight: "400", letterSpacing: 0.05 },
} as const

export const nativeMotion = {
  // Spring animation config for react-native-reanimated withSpring
  spring: { damping: 15, stiffness: 170, mass: 1 },
  // Duration-based config (ms)
  fast: 150,
  base: 250,
  slow: 400,
} as const

// Convenience: full token bundle
export const nativeTokens = {
  glass: nativeGlass,
  colors: nativeColors,
  radius: nativeRadius,
  spacing: nativeSpacing,
  text: nativeText,
  motion: nativeMotion,
} as const
