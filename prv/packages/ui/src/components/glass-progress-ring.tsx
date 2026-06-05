"use client"

import React, { useEffect, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassProgressRingProps {
  value: number
  size?: "xs" | "sm" | "md" | "lg" | number
  strokeWidth?: number
  strokeColor?: string
  sublabel?: string
  animated?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Size presets ──────────────────────────────────────────────────────────────

const presets: Record<"xs" | "sm" | "md" | "lg", { px: number; sw: number; font: number }> = {
  xs: { px: 48, sw: 4, font: 12 },
  sm: { px: 64, sw: 5, font: 15 },
  md: { px: 96, sw: 6, font: 20 },
  lg: { px: 128, sw: 8, font: 26 },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassProgressRing({
  value,
  size = "md",
  strokeWidth,
  strokeColor,
  sublabel,
  animated = true,
  className,
  style,
}: GlassProgressRingProps) {
  const [drawn, setDrawn] = useState(!animated)

  useEffect(() => {
    if (!animated) return
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
  }, [animated])

  // resolve dimensions
  const preset = typeof size === "string" ? presets[size] : null
  const px = preset ? preset.px : (size as number)
  const sw = strokeWidth ?? (preset ? preset.sw : Math.round(px / 16))
  const vFont = preset ? preset.font : Math.round(px / 5)
  const vSub = Math.max(vFont * 0.5, 9)

  const r = (px - sw) / 2
  const circ = 2 * Math.PI * r
  const clampedValue = Math.max(0, Math.min(100, value))
  const offset = circ * (1 - clampedValue / 100)

  return (
    <div
      className={clsx("relative inline-flex items-center justify-center", className)}
      style={{ width: px, height: px, flexShrink: 0, ...style }}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* track */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke="var(--prv-border-subtle)"
          strokeWidth={sw}
        />
        {/* fill */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke={strokeColor ?? "var(--prv-text-2)"}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={drawn ? offset : circ}
          style={
            animated ? { transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" } : undefined
          }
        />
      </svg>

      {/* center label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        aria-label={`${clampedValue}%${sublabel ? ` ${sublabel}` : ""}`}
      >
        <span
          style={{
            fontSize: vFont,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {clampedValue}%
        </span>
        {sublabel && (
          <span
            style={{
              fontSize: vSub,
              color: "var(--prv-text-3)",
              marginTop: 2,
              lineHeight: 1,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
