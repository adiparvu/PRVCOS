import React from "react"
import { clsx } from "clsx"

type PanelVariant = "default" | "elevated"

// GlassPanel is an inner content section used inside sheets and modals.
// Unlike GlassCard it carries no floating shadow — it groups fields/info
// within an already-elevated glass surface.
const variantStyle: Record<PanelVariant, React.CSSProperties> = {
  default: {
    background: "var(--prv-g1)",
    borderColor: "var(--prv-border-subtle)",
    borderRadius: "16px",
  },
  elevated: {
    background: "var(--prv-g2)",
    borderColor: "var(--prv-border)",
    borderRadius: "16px",
  },
}

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant
  /** Remove default 16px/20px padding */
  noPadding?: boolean
  children: React.ReactNode
}

export function GlassPanel({
  variant = "default",
  noPadding = false,
  className,
  style,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={clsx("border backdrop-blur-xl", !noPadding && "px-4 py-3.5", className)}
      style={{ ...variantStyle[variant], ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
