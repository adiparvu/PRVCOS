// Liquid Glass Design Tokens — PRV Design System

export const glass = {
  // Opacity levels
  level1: "rgba(255,255,255,0.06)", // Cards, Panels
  level2: "rgba(255,255,255,0.10)", // Menus, Sheets
  level3: "rgba(255,255,255,0.16)", // Modals, Overlays
  level4: "rgba(255,255,255,0.22)", // Critical overlays

  // Blur levels
  blur: {
    sm: "blur(16px)",
    md: "blur(32px)",
    lg: "blur(48px)",
    xl: "blur(64px)",
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

  // Shadow
  shadow: "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)",

  // Border
  border: "rgba(255,255,255,0.12)",
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
