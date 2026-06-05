import React from "react"
import { clsx } from "clsx"

type GlassLevel = 1 | 2 | 3 | 4

const glassVarByLevel: Record<GlassLevel, string> = {
  1: "var(--prv-g1)",
  2: "var(--prv-g2)",
  3: "var(--prv-g3)",
  4: "var(--prv-g4)",
}

const specularVarByLevel: Record<GlassLevel, string> = {
  1: "var(--prv-g1-spec)",
  2: "var(--prv-g2-spec)",
  3: "var(--prv-g3-spec)",
  4: "var(--prv-g4-spec)",
}

const blurByLevel: Record<GlassLevel, string> = {
  1: "backdrop-blur-xl backdrop-saturate-[140%]",
  2: "backdrop-blur-2xl backdrop-saturate-[180%]",
  3: "backdrop-blur-3xl backdrop-saturate-[200%]",
  4: "backdrop-blur-[80px] backdrop-saturate-[220%]",
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
  style,
  children,
  ...props
}: GlassCardProps) {
  const shadowParts: string[] = []
  if (!flat) shadowParts.push("var(--prv-shadow-e4)")
  if (specular) shadowParts.push(`inset 0 1px 0 ${specularVarByLevel[level]}`)

  return (
    <div
      className={clsx("rounded-[20px]", blurByLevel[level], !borderless && "border", className)}
      style={{
        background: glassVarByLevel[level],
        borderColor: borderless ? undefined : "var(--prv-border)",
        boxShadow: shadowParts.length ? shadowParts.join(", ") : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
