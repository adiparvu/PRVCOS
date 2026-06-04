import React from "react"
import { clsx } from "clsx"

type GlassLevel = 1 | 2 | 3 | 4

const bgByLevel: Record<GlassLevel, string> = {
  1: "bg-white/[0.06]",
  2: "bg-white/[0.10]",
  3: "bg-white/[0.16]",
  4: "bg-white/[0.22]",
}

const blurByLevel: Record<GlassLevel, string> = {
  1: "backdrop-blur-xl",
  2: "backdrop-blur-2xl",
  3: "backdrop-blur-3xl",
  4: "backdrop-blur-[64px]",
}

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel
  /** Show specular top-edge highlight */
  specular?: boolean
  /** Remove border */
  borderless?: boolean
  /** Remove shadow */
  flat?: boolean
  children: React.ReactNode
}

export function GlassCard({
  level = 1,
  specular = true,
  borderless = false,
  flat = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={clsx(
        "rounded-[20px]",
        bgByLevel[level],
        blurByLevel[level],
        !borderless && "border border-white/[0.12]",
        !flat && "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.4)]",
        specular && "ring-[0.5px] ring-inset ring-white/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
