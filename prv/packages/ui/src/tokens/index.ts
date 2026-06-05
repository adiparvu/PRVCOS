// Liquid Glass Design Tokens — PRV Design System
// Canonical source: DESIGN_SYSTEM.md §2 (Material System)
// CSS custom properties (the runtime source of truth) live in @prv/ui/styles/tokens

export const glass = {
  level1: "rgba(255,255,255,0.06)",
  level2: "rgba(255,255,255,0.10)",
  level3: "rgba(255,255,255,0.16)",
  level4: "rgba(255,255,255,0.22)",

  blur: {
    sm: "blur(32px)",
    md: "blur(48px)",
    lg: "blur(64px)",
    xl: "blur(80px)",
  },

  saturation: {
    level1: "saturate(140%)",
    level2: "saturate(180%)",
    level3: "saturate(200%)",
    level4: "saturate(220%)",
  },

  specular: "inset 0 1px 0 rgba(255,255,255,0.25)",

  shadow: {
    e1: "0 4px 16px rgba(0,0,0,0.40)",
    e2: "0 8px 32px rgba(0,0,0,0.50)",
    e3: "0 16px 48px rgba(0,0,0,0.60)",
    e4: "0 24px 64px rgba(0,0,0,0.70),0 8px 24px rgba(0,0,0,0.40)",
  },

  border: "rgba(255,255,255,0.12)",
  borderStrong: "rgba(255,255,255,0.20)",
  borderSubtle: "rgba(255,255,255,0.06)",
} as const

export const colors = {
  background: "#000000",
  text: {
    primary: "rgba(255,255,255,0.95)",
    secondary: "rgba(255,255,255,0.65)",
    tertiary: "rgba(255,255,255,0.35)",
    disabled: "rgba(255,255,255,0.15)",
  },
  border: "rgba(255,255,255,0.12)",
  shine: "rgba(255,255,255,0.32)",
  accent: "#FFFFFF",
} as const

export const radius = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  base: "16px",
  card: "20px",
  panel: "24px",
  sheet: "32px",
  phone: "44px",
  pill: "100px",
} as const

export const motion = {
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  duration: {
    fast: "150ms",
    base: "250ms",
    slow: "400ms",
  },
} as const

// CSS variable name constants — use to reference vars programmatically
export const cssVars = {
  g1: "var(--prv-g1)",
  g2: "var(--prv-g2)",
  g3: "var(--prv-g3)",
  g4: "var(--prv-g4)",
  text1: "var(--prv-text-1)",
  text2: "var(--prv-text-2)",
  text3: "var(--prv-text-3)",
  text4: "var(--prv-text-4)",
  border: "var(--prv-border)",
  borderStrong: "var(--prv-border-strong)",
  borderSubtle: "var(--prv-border-subtle)",
  shadowE2: "var(--prv-shadow-e2)",
  shadowE4: "var(--prv-shadow-e4)",
  bg: "var(--prv-bg)",
  scrim: "var(--prv-scrim)",
} as const

export * from "./native"
