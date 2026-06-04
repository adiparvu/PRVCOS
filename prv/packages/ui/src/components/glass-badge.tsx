import React from "react"
import { clsx } from "clsx"

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple"

const variantMap: Record<BadgeVariant, string> = {
  default: "bg-white/[0.10] text-white/70 border-white/[0.12]",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  error: "bg-red-500/15 text-red-400 border-red-500/25",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  purple: "bg-violet-500/15 text-violet-400 border-violet-500/25",
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
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-amber-400",
            variant === "error" && "bg-red-400",
            variant === "info" && "bg-sky-400",
            variant === "purple" && "bg-violet-400"
          )}
        />
      )}
      {children}
    </span>
  )
}
