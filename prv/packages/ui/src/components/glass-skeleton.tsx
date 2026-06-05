"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkeletonVariant = "text" | "block" | "circle" | "card"

export interface GlassSkeletonProps {
  variant?: SkeletonVariant
  width?: number | string
  height?: number | string
  animated?: boolean
  count?: number
  gap?: number
  className?: string
  style?: React.CSSProperties
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const SHIMMER_CSS = `@keyframes prvSkel{0%{background-position:-600px 0}100%{background-position:600px 0}}`

const shimmerStyle = {
  background:
    "linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.05) 75%)",
  backgroundSize: "600px 100%",
  animation: "prvSkel 1.6s ease-in-out infinite",
} as const

const staticStyle = {
  background: "rgba(255,255,255,0.07)",
} as const

// ── Default dimensions per variant ───────────────────────────────────────────

const defaults: Record<
  SkeletonVariant,
  { height: number | string; borderRadius: number | string }
> = {
  text: { height: 14, borderRadius: 4 },
  block: { height: 64, borderRadius: 12 },
  circle: { height: 40, borderRadius: "50%" },
  card: { height: 120, borderRadius: 16 },
}

// ── Single skeleton element ───────────────────────────────────────────────────

function SkeletonEl({
  variant = "text",
  width,
  height,
  animated,
  className,
  style,
}: Omit<GlassSkeletonProps, "count" | "gap">) {
  const def = defaults[variant]
  const isCircle = variant === "circle"

  const resolvedWidth = width ?? (isCircle ? def.height : "100%")
  const resolvedHeight = height ?? def.height

  return (
    <div
      className={className}
      style={{
        width: resolvedWidth,
        height: resolvedHeight,
        borderRadius: def.borderRadius,
        flexShrink: 0,
        ...(animated ? shimmerStyle : staticStyle),
        ...style,
      }}
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSkeleton({
  variant = "text",
  width,
  height,
  animated = true,
  count,
  gap = 8,
  className,
  style,
}: GlassSkeletonProps) {
  return (
    <>
      {animated && <style>{SHIMMER_CSS}</style>}
      {count && count > 1 ? (
        <div className={clsx("flex flex-col", className)} style={{ gap, ...style }}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonEl
              key={i}
              variant={variant}
              width={width}
              height={height}
              animated={animated}
              // fade out successive lines slightly for a natural look
              style={{ opacity: 1 - i * (0.15 / count) }}
            />
          ))}
        </div>
      ) : (
        <SkeletonEl
          variant={variant}
          width={width}
          height={height}
          animated={animated}
          className={className}
          style={style}
        />
      )}
    </>
  )
}
