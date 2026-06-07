export const colors = {
  bg: "#000000",

  glass1: "rgba(255,255,255,0.06)",
  glass2: "rgba(255,255,255,0.10)",
  glass3: "rgba(255,255,255,0.16)",

  tabBar: "rgba(20,20,20,0.92)",

  text1: "rgba(255,255,255,0.92)",
  text2: "rgba(255,255,255,0.65)",
  text3: "rgba(255,255,255,0.35)",
  text4: "rgba(255,255,255,0.15)",

  border: "rgba(255,255,255,0.12)",
  borderSubtle: "rgba(255,255,255,0.07)",
  shine: "rgba(255,255,255,0.22)",
  shineTop: "rgba(255,255,255,0.32)",

  green: "#30d158",
  amber: "#ff9f0a",
  red: "#ff453a",
  blue: "#0a84ff",
  purple: "#bf5af2",
} as const

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  card: 20,
  panel: 24,
  sheet: 32,
  tab: 28,
  pill: 100,
} as const

export const blur = {
  sm: 16,
  md: 32,
  lg: 48,
  xl: 64,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const

export const type = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, letterSpacing: -0.4 },
  title1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  title2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.26 },
  title3: { fontSize: 20, fontWeight: "600" as const, letterSpacing: -0.24 },
  headline: { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: "400" as const, letterSpacing: -0.2 },
  callout: { fontSize: 16, fontWeight: "400" as const, letterSpacing: -0.16 },
  subhead: { fontSize: 15, fontWeight: "400" as const, letterSpacing: -0.16 },
  footnote: { fontSize: 13, fontWeight: "400" as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, fontWeight: "400" as const, letterSpacing: -0.06 },
  caption2: { fontSize: 11, fontWeight: "400" as const, letterSpacing: 0.06 },
} as const
