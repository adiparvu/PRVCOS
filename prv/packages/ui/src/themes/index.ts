// Appearance & Personalization System — theme types and CSS variable maps
// Canonical values from DESIGN_SYSTEM.md §1.4, §1.5, §1.6

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

// CSS variable maps — applied as [data-theme] and [data-glass] on <html>
// Values are the canonical source from DESIGN_SYSTEM.md §1.4 (dark) and §1.5 (light)

export const THEME_CSS_VARS = {
  dark: {
    "--prv-bg": "#000000",
    "--prv-bg-elevated": "#0a0a0a",
    "--prv-bg-modal": "#111111",
    "--prv-text-1": "rgba(255,255,255,0.95)",
    "--prv-text-2": "rgba(255,255,255,0.65)",
    "--prv-text-3": "rgba(255,255,255,0.35)",
    "--prv-text-4": "rgba(255,255,255,0.15)",
    "--prv-border": "rgba(255,255,255,0.12)",
    "--prv-border-strong": "rgba(255,255,255,0.20)",
    "--prv-border-subtle": "rgba(255,255,255,0.06)",
    "--prv-specular": "rgba(255,255,255,0.32)",
    "--prv-scrim": "rgba(0,0,0,0.50)",
    "--prv-g1": "rgba(255,255,255,0.06)",
    "--prv-g2": "rgba(255,255,255,0.10)",
    "--prv-g3": "rgba(255,255,255,0.16)",
    "--prv-g4": "rgba(255,255,255,0.22)",
    "--prv-g1-specular": "rgba(255,255,255,0.25)",
    "--prv-g2-specular": "rgba(255,255,255,0.30)",
    "--prv-g3-specular": "rgba(255,255,255,0.35)",
    "--prv-g4-specular": "rgba(255,255,255,0.40)",
    "--prv-shadow-e1": "0 4px 16px rgba(0,0,0,0.40)",
    "--prv-shadow-e2": "0 8px 32px rgba(0,0,0,0.50)",
    "--prv-shadow-e3": "0 16px 48px rgba(0,0,0,0.60)",
    "--prv-shadow-e4": "0 24px 64px rgba(0,0,0,0.70),0 8px 24px rgba(0,0,0,0.40)",
  },
  light: {
    "--prv-bg": "#f2f2f7",
    "--prv-bg-elevated": "#ffffff",
    "--prv-bg-modal": "#f2f2f7",
    "--prv-text-1": "rgba(0,0,0,0.90)",
    "--prv-text-2": "rgba(0,0,0,0.60)",
    "--prv-text-3": "rgba(0,0,0,0.35)",
    "--prv-text-4": "rgba(0,0,0,0.20)",
    "--prv-border": "rgba(0,0,0,0.08)",
    "--prv-border-strong": "rgba(0,0,0,0.14)",
    "--prv-border-subtle": "rgba(0,0,0,0.04)",
    "--prv-specular": "rgba(255,255,255,0.90)",
    "--prv-scrim": "rgba(0,0,0,0.30)",
    "--prv-g1": "rgba(255,255,255,0.72)",
    "--prv-g2": "rgba(255,255,255,0.80)",
    "--prv-g3": "rgba(255,255,255,0.88)",
    "--prv-g4": "rgba(255,255,255,0.95)",
    "--prv-g1-specular": "rgba(255,255,255,0.90)",
    "--prv-g2-specular": "rgba(255,255,255,0.92)",
    "--prv-g3-specular": "rgba(255,255,255,0.95)",
    "--prv-g4-specular": "rgba(255,255,255,0.98)",
    "--prv-shadow-e1": "0 4px 16px rgba(0,0,0,0.07)",
    "--prv-shadow-e2": "0 8px 32px rgba(0,0,0,0.09)",
    "--prv-shadow-e3": "0 16px 48px rgba(0,0,0,0.11)",
    "--prv-shadow-e4": "0 24px 64px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.07)",
  },
} as const satisfies Record<"dark" | "light", Record<string, string>>

// Glass style modifiers are applied via [data-glass] and handled in CSS
// Translucid: CSS multiplies --prv-g* opacity by 0.60 via custom property override
// Tinted:     CSS adds rgba(100,105,130,0.12) tint layer via ::before pseudo-element
// Adaptive:   Standard values; data-density="high" elements auto-promote to next level
