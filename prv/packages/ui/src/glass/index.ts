import type React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs))
}

// Structural Tailwind classes shared across glass surfaces.
// Theme-sensitive properties (background, border-color, box-shadow) must be
// applied via inline style using CSS variables — not encoded here.
export const glassCard = cn("backdrop-blur-xl backdrop-saturate-[140%]", "border rounded-[20px]")

export const glassSheet = cn(
  "backdrop-blur-[48px] backdrop-saturate-[180%]",
  "border rounded-t-[32px]"
)

export const glassModal = cn(
  "backdrop-blur-[64px] backdrop-saturate-[200%]",
  "border rounded-[32px]"
)

export const glassNav = cn(
  "backdrop-blur-[48px] backdrop-saturate-[180%]",
  "border rounded-[100px]"
)

// Inline style objects for glass surfaces — use these with the class builders above.
// They consume CSS variables set by @prv/ui/styles/tokens and are theme-aware.
export const glassCardStyle: React.CSSProperties = {
  background: "var(--prv-g1)",
  borderColor: "var(--prv-border)",
  boxShadow: "var(--prv-shadow-e4), inset 0 1px 0 var(--prv-g1-spec)",
}

export const glassSheetStyle: React.CSSProperties = {
  background: "var(--prv-g2)",
  borderColor: "var(--prv-border)",
  boxShadow: "var(--prv-shadow-e4), inset 0 1px 0 var(--prv-g2-spec)",
}

export const glassModalStyle: React.CSSProperties = {
  background: "var(--prv-g3)",
  borderColor: "var(--prv-border)",
  boxShadow: "0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 var(--prv-g3-spec)",
}

export const glassNavStyle: React.CSSProperties = {
  background: "var(--prv-g2)",
  borderColor: "var(--prv-border)",
  boxShadow: "var(--prv-shadow-e2), inset 0 1px 0 var(--prv-g2-spec)",
}
