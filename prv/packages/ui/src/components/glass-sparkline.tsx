"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SparklineTrend = "up" | "down" | "neutral" | "auto"

export interface GlassSparklineProps {
  data: number[]
  width?: number
  height?: number
  /** Explicit stroke color. Overrides trend coloring. */
  color?: string
  /** Color by trend direction when no explicit color is given. Default "auto". */
  trend?: SparklineTrend
  /** Show the gradient area fill under the line. Default true. */
  area?: boolean
  /** Show a dot on the last data point. Default true. */
  showDot?: boolean
  /** Stroke width. Default 2. */
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

// ── Colors ────────────────────────────────────────────────────────────────────

const GREEN = "var(--prv-green, rgba(48,209,88,0.95))"
const RED = "var(--prv-red, rgba(255,69,58,0.95))"
const ACCENT = "var(--prv-accent, rgba(10,132,255,0.9))"

function resolveColor(data: number[], color: string | undefined, trend: SparklineTrend): string {
  if (color) return color
  if (trend === "up") return GREEN
  if (trend === "down") return RED
  if (trend === "neutral") return ACCENT
  // auto
  const first = data[0] ?? 0
  const last = data[data.length - 1] ?? 0
  if (last > first) return GREEN
  if (last < first) return RED
  return ACCENT
}

let gradCounter = 0

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSparkline({
  data,
  width = 200,
  height = 44,
  color,
  trend = "auto",
  area = true,
  showDot = true,
  strokeWidth = 2,
  className,
  style,
}: GlassSparklineProps) {
  const [gradId] = React.useState(() => `prv-spark-${(gradCounter++).toString(36)}`)

  if (data.length < 2) {
    return (
      <svg
        className={clsx(className)}
        width={width}
        height={height}
        style={style}
        aria-hidden="true"
      />
    )
  }

  const pad = 4
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stroke = resolveColor(data, color, trend)

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - 2 * pad)
    const y = height - pad - ((v - min) / range) * (height - 2 * pad)
    return [x, y] as const
  })

  const line = points
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ")
  const areaPath = `${line} L${width - pad} ${height} L${pad} ${height} Z`
  const last = points[points.length - 1]!

  return (
    <svg
      className={clsx(className)}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Sparkline trend"
      style={style}
    >
      {area && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {area && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showDot && <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r={3} fill={stroke} />}
    </svg>
  )
}
