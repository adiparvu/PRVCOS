// Liquid Glass Design Tokens — PRV Design System
// Canonical source: DESIGN_SYSTEM.md §2 (Material System)

export const glass = {
  // Opacity levels — dark mode (default). Light mode uses CSS variables.
  level1: "rgba(255,255,255,0.06)", // Cards, Panels
  level2: "rgba(255,255,255,0.10)", // Menus, Sheets
  level3: "rgba(255,255,255,0.16)", // Modals, Overlays
  level4: "rgba(255,255,255,0.22)", // Critical overlays

  // Blur levels — canonical values from DESIGN_SYSTEM.md Appendix A
  // (corrected from previous 16/32/48/64 to canonical 32/48/64/80)
  blur: {
    sm: "blur(32px)", // Glass 1 — Cards, Panels
    md: "blur(48px)", // Glass 2 — Menus, Sheets
    lg: "blur(64px)", // Glass 3 — Modals, Overlays
    xl: "blur(80px)", // Glass 4 — Command Palette, Critical
  },

  // Saturation
  saturation: {
    level1: "saturate(140%)",
    level2: "saturate(180%)",
    level3: "saturate(200%)",
    level4: "saturate(220%)",
  },

  // Specular highlight (top edge)
  specular: "inset 0 1px 0 rgba(255,255,255,0.25)",

  // Shadow elevation scale
  shadow: {
    e1: "0 4px 16px rgba(0,0,0,0.40)",
    e2: "0 8px 32px rgba(0,0,0,0.50)",
    e3: "0 16px 48px rgba(0,0,0,0.60)",
    e4: "0 24px 64px rgba(0,0,0,0.70),0 8px 24px rgba(0,0,0,0.40)",
  },

  // Border
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
