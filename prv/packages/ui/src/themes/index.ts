// Appearance & Personalization System — theme types
// CSS variable values are the single source of truth in apps/web/src/app/globals.css
// This file defines TypeScript types only — do NOT duplicate variable values here.

export type Theme = "light" | "dark" | "system"
export type GlassStyle = "translucid" | "tinted" | "adaptive"

export interface AppearancePrefs {
  theme: Theme
  glassStyle: GlassStyle
  syncEnabled: boolean
}

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: "system",
  glassStyle: "adaptive",
  syncEnabled: true,
}
