import React from "react"
import { clsx } from "clsx"

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple"

// Severity conveyed via glass opacity weight + border strength — never color (monochrome rule).
// default  = low emphasis, success = standard positive, warning = medium attention,
// error = high attention, info = informational, purple = premium/special.
const variantStyle: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: "var(--prv-g1)",
    borderColor: "var(--prv-border)",
    color: "var(--prv-text-2)",
  },
  success: {
    background: "var(--prv-g1)",
    borderColor: "var(--prv-border-subtle)",
    color: "var(--prv-text-2)",
  },
  warning: {
    background: "var(--prv-g2)",
    borderColor: "var(--prv-border)",
    color: "var(--prv-text-1)",
  },
  error: {
    background: "var(--prv-g3)",
    borderColor: "var(--prv-border-strong)",
    color: "var(--prv-text-1)",
  },
  info: {
    background: "var(--prv-g1)",
    borderColor: "var(--prv-border-subtle)",
    color: "var(--prv-text-3)",
  },
  // Purple is the single exception — uses a subtle purple tint for "premium" semantics
  purple: {
    background: "color-mix(in srgb, var(--prv-g2) 70%, rgb(120 100 200) 30%)",
    borderColor: "rgba(140,120,220,0.25)",
    color: "rgba(180,160,255,0.9)",
  },
}

const dotOpacity: Record<BadgeVariant, string> = {
  default: "0.5",
  success: "0.5",
  warning: "0.75",
  error: "0.9",
  info: "0.4",
  purple: "0.7",
}

export interface GlassBadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function GlassBadge({
  variant = "default",
  dot = false,
  children,
  className,
  style,
}: GlassBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5",
        "rounded-full border text-[12px] font-medium",
        className
      )}
      style={{ ...variantStyle[variant], ...style }}
    >
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: `currentColor`, opacity: dotOpacity[variant] }}
        />
      )}
      {children}
    </span>
  )
}
