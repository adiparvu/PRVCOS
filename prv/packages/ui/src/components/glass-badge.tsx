import React from "react"
import { clsx } from "clsx"

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple"

// B&W monochrome severity system — DESIGN_SYSTEM.md §6.14
// Danger signalled via opacity weight + border strength, never color
const variantMap: Record<BadgeVariant, string> = {
  default: "bg-white/[0.08] text-white/65 border-white/[0.12]",
  success: "bg-white/[0.06] text-white/65 border-white/[0.10]",
  warning: "bg-white/[0.12] text-white/80 border-white/[0.18]",
  error: "bg-white/[0.18] text-white/95 border-white/[0.28]",
  info: "bg-white/[0.08] text-white/55 border-white/[0.10]",
  purple: "bg-white/[0.10] text-white/70 border-white/[0.14]",
}

export interface GlassBadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export function GlassBadge({
  variant = "default",
  dot = false,
  children,
  className,
}: GlassBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5",
        "rounded-full border text-[12px] font-medium",
        variantMap[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            "inline-block h-1.5 w-1.5 rounded-full",
            variant === "default" && "bg-white/50",
            variant === "success" && "bg-white/50",
            variant === "warning" && "bg-white/75",
            variant === "error" && "bg-white/90",
            variant === "info" && "bg-white/40",
            variant === "purple" && "bg-white/60"
          )}
        />
      )}
      {children}
    </span>
  )
}
